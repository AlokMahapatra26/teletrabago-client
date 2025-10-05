'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { TaskColumn } from './TaskColumn';
import { CreateTaskDialog } from './CreateTaskDialog';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to?: string;
  assigned_user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface TaskBoardProps {
  companyId: string;
}

export function TaskBoard({ companyId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (companyId) {
      fetchTasks();
      fetchUserRole();
    }
  }, [companyId]);

  const fetchTasks = async () => {
    try {
      const data = await apiRequest(`/api/tasks?company_id=${companyId}`);
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      const data = await apiRequest(`/api/companies/${companyId}/role`);
      setUserRole(data.role);
    } catch (error) {
      console.error('Failed to fetch user role:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    const overTask = tasks.find((t) => t.id === overId);

    if (!activeTask) return;

    const isOverColumn = ['todo', 'in_progress', 'done'].includes(overId);

    if (isOverColumn) {
      const newStatus = overId as Task['status'];
      
      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === activeId ? { ...t, status: newStatus } : t
        )
      );
    } else if (overTask && activeTask.status === overTask.status) {
      setTasks((tasks) => {
        const oldIndex = tasks.findIndex((t) => t.id === activeId);
        const newIndex = tasks.findIndex((t) => t.id === overId);
        return arrayMove(tasks, oldIndex, newIndex);
      });
    } else if (overTask && activeTask.status !== overTask.status) {
      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === activeId ? { ...t, status: overTask.status } : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const activeTask = tasks.find((t) => t.id === activeId);

    if (!activeTask) return;

    try {
      console.log('Updating task:', activeId, 'to status:', activeTask.status);
      
      const response = await apiRequest(`/api/tasks/${activeId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: activeTask.status,
          title: activeTask.title,
          description: activeTask.description,
          assigned_to: activeTask.assigned_to
        }),
      });
      
      console.log('Update response:', response);
      
      // Refresh tasks to get updated data with user info
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      fetchTasks();
    }
  };

  const columns = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  if (loading) {
    return <div className="p-4">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Task Board</h2>
          {userRole && (
            <p className="text-sm text-muted-foreground">
              Your role: <span className="font-medium">{userRole}</span>
            </p>
          )}
        </div>
        <CreateTaskDialog companyId={companyId} onTaskCreated={fetchTasks} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TaskColumn
            id="todo"
            title="To Do"
            tasks={columns.todo}
            userRole={userRole}
            onTaskDeleted={fetchTasks}
          />
          <TaskColumn
            id="in_progress"
            title="In Progress"
            tasks={columns.in_progress}
            userRole={userRole}
            onTaskDeleted={fetchTasks}
          />
          <TaskColumn
            id="done"
            title="Done"
            tasks={columns.done}
            userRole={userRole}
            onTaskDeleted={fetchTasks}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <Card className="p-3 border-2 border-primary bg-background">
              <h4 className="font-medium">{activeTask.title}</h4>
              {activeTask.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTask.description}
                </p>
              )}
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
