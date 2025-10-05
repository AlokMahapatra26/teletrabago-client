import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { Card } from '@/components/ui/card';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    assigned_user?: {
        id: string;
        email: string;
        full_name?: string;
    };
}

interface TaskColumnProps {
    id: string;
    title: string;
    tasks: Task[];
    userRole: string | null;
    onTaskDeleted: () => void;
}

export function TaskColumn({ id, title, tasks, userRole, onTaskDeleted }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  const canDelete = userRole === 'owner' || userRole === 'admin';

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 border-b border-border pb-2">
        {title} ({tasks.length})
      </h3>
      <SortableContext
        id={id}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`min-h-[500px] space-y-2 transition-colors ${
            isOver ? 'bg-muted' : ''
          }`}
        >
          {tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Drop tasks here
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="relative group">
                <TaskCard task={task} />
                {canDelete && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteTaskDialog
                      taskId={task.id}
                      taskTitle={task.title}
                      onTaskDeleted={onTaskDeleted}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SortableContext>
    </Card>
  );
}