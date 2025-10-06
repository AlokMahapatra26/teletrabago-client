'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { PenTool, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Whiteboard {
  id: string;
  title: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

interface WhiteboardsListProps {
  companyId: string;
  onSelectWhiteboard: (whiteboard: Whiteboard) => void;
  selectedWhiteboardId?: string;
}

export function WhiteboardsList({
  companyId,
  onSelectWhiteboard,
  selectedWhiteboardId,
}: WhiteboardsListProps) {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchWhiteboards();
    }
  }, [companyId]);

  const fetchWhiteboards = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/whiteboards?company_id=${companyId}`);
      setWhiteboards(data.whiteboards || []);
    } catch (error) {
      console.error('Failed to fetch whiteboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWhiteboard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;

    try {
      const data = await apiRequest('/api/whiteboards', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          title: title || 'Untitled Whiteboard',
        }),
      });

      setWhiteboards((prev) => [data.whiteboard, ...prev]);
      setOpen(false);
      onSelectWhiteboard(data.whiteboard);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Failed to create whiteboard:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWhiteboard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this whiteboard?')) return;

    try {
      await apiRequest(`/api/whiteboards/${id}`, {
        method: 'DELETE',
      });
      setWhiteboards((prev) => prev.filter((wb) => wb.id !== id));
    } catch (error) {
      console.error('Failed to delete whiteboard:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin border-2 border-current border-r-transparent"></div>
          Loading whiteboards...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Whiteboards</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Whiteboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Whiteboard</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateWhiteboard} className="space-y-4">
              <div>
                <Label htmlFor="title">Whiteboard Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Enter whiteboard title..."
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? 'Creating...' : 'Create Whiteboard'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {whiteboards.length === 0 ? (
          <div className="text-center py-8">
            <PenTool className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No whiteboards yet</p>
          </div>
        ) : (
          whiteboards.map((whiteboard) => (
            <div
              key={whiteboard.id}
              className={`p-3 border-2 border-border hover:bg-muted/50 cursor-pointer transition-colors group ${
                selectedWhiteboardId === whiteboard.id ? 'bg-muted border-primary' : ''
              }`}
              onClick={() => onSelectWhiteboard(whiteboard)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-medium text-sm truncate">{whiteboard.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated{' '}
                    {formatDistanceToNow(new Date(whiteboard.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWhiteboard(whiteboard.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
