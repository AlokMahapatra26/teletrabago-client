import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="p-3 cursor-grab active:cursor-grabbing hover:bg-muted transition-colors border-2 border-border">
        <h4 className="font-medium">{task.title}</h4>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {task.description}
          </p>
        )}
        {task.assigned_user && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              {task.assigned_user.full_name || task.assigned_user.email}
            </Badge>
          </div>
        )}
      </Card>
    </div>
  );
}
