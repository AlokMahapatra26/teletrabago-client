'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CollaborativeCanvas } from './CollaborativeCanvas';
import { apiRequest } from '@/lib/api';
import { PenTool, Save, Users } from 'lucide-react';

interface Whiteboard {
  id: string;
  title: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

interface WhiteboardEditorProps {
  whiteboard: Whiteboard;
  onTitleChange: (title: string) => void;
}

export function WhiteboardEditor({ whiteboard, onTitleChange }: WhiteboardEditorProps) {
  const [title, setTitle] = useState(whiteboard.title);
  const [saving, setSaving] = useState(false);

  const handleSaveTitle = async () => {
    if (title === whiteboard.title) return;

    setSaving(true);
    try {
      await apiRequest(`/api/whiteboards/${whiteboard.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
      });
      onTitleChange(title);
    } catch (error) {
      console.error('Failed to save title:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Whiteboard Header */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <PenTool className="h-5 w-5 text-muted-foreground" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            className="flex-1 text-lg font-semibold"
            placeholder="Whiteboard title..."
          />
          <Button
            onClick={handleSaveTitle}
            disabled={saving || title === whiteboard.title}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Card>

      
      <CollaborativeCanvas whiteboardId={whiteboard.id} />
    </div>
  );
}
