'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TiptapEditor } from './TiptapEditor';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { FileText, Save, Users, Wifi, WifiOff } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

interface DocumentEditorProps {
  document: Document;
  onTitleChange: (title: string) => void;
}

export function DocumentEditor({ document, onTitleChange }: DocumentEditorProps) {
  const [title, setTitle] = useState(document.title);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    console.log('=== Initializing Yjs document ===');
    console.log('Document ID:', document.id);
    console.log('User:', user?.email || 'Anonymous');
    
    const yDoc = new Y.Doc();
    
    // IMPORTANT: Use document.id as room name directly
    const wsProvider = new WebsocketProvider(
      'ws://localhost:5000', // WebSocket URL
      `documents/${document.id}`, // Room name
      yDoc,
      {
        connect: true,
      }
    );

    // Debug: Log all WebSocket events
    wsProvider.on('status', (event: any) => {
      console.log('📡 WebSocket status:', event.status);
      setConnectionStatus(event.status);
      
      if (event.status === 'connected') {
        console.log('✓ WebSocket connected successfully!');
      } else if (event.status === 'disconnected') {
        console.log('✗ WebSocket disconnected');
      }
    });

    wsProvider.on('sync', (isSynced: boolean) => {
      console.log('🔄 Document synced:', isSynced);
    });

    // Track connected users
    const updateAwareness = () => {
      const states = wsProvider.awareness.getStates();
      const userCount = states.size;
      setConnectedUsers(userCount);
      
      console.log('👥 Connected users:', userCount);
      console.log('Awareness states:', Array.from(states.entries()).map(([id, state]) => ({
        id,
        user: state.user,
      })));
    };

    wsProvider.awareness.on('change', updateAwareness);
    wsProvider.awareness.on('update', updateAwareness);

    // Set user info in awareness
    const userInfo = {
      name: user?.full_name || user?.email || 'Anonymous',
      email: user?.email || '',
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
    };
    
    console.log('Setting awareness user:', userInfo);
    wsProvider.awareness.setLocalStateField('user', userInfo);

    // Debug: Log document updates
    yDoc.on('update', (update: Uint8Array, origin: any) => {
      console.log('📝 Document updated, origin:', origin === wsProvider ? 'remote' : 'local');
    });

    setDoc(yDoc);
    setProvider(wsProvider);

    return () => {
      console.log('🧹 Cleaning up document connection');
      wsProvider.awareness.off('change', updateAwareness);
      wsProvider.awareness.off('update', updateAwareness);
      wsProvider.destroy();
      yDoc.destroy();
    };
  }, [document.id, isMounted, user]);

  const handleSaveTitle = async () => {
    if (title === document.title) return;

    setSaving(true);
    try {
      await apiRequest(`/api/documents/${document.id}`, {
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

  if (!isMounted) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin border-2 border-current border-r-transparent"></div>
          Loading editor...
        </div>
      </Card>
    );
  }

  if (!doc || !provider) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin border-2 border-current border-r-transparent"></div>
          Connecting to document...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Document Header */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            className="flex-1 text-lg font-semibold"
            placeholder="Document title..."
          />
          <Button
            onClick={handleSaveTitle}
            disabled={saving || title === document.title}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
              className="gap-2"
            >
              {connectionStatus === 'connected' ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {connectionStatus}
            </Badge>
            
            <Badge variant="secondary" className="gap-2">
              <Users className="h-3 w-3" />
              {connectedUsers} online
            </Badge>
          </div>
        </div>
      </Card>

      {/* Editor */}
      {connectionStatus === 'connected' ? (
        <TiptapEditor
          doc={doc}
          provider={provider}
          userName={user?.full_name || user?.email || 'Anonymous'}
        />
      ) : (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin border-4 border-current border-r-transparent"></div>
            <p className="text-muted-foreground">Connecting to collaboration server...</p>
          </div>
        </Card>
      )}
    </div>
  );
}
