'use client';

import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Pencil, Square, Circle, Type, Trash2, Minus } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DrawElement {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'text' | 'arrow';
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  userId: string;
  userName: string;
}

interface RemoteUser {
  clientId: number;
  name: string;
  color: string;
  cursor?: Point;
}

interface CollaborativeCanvasProps {
  whiteboardId: string;
}

export function CollaborativeCanvas({ whiteboardId }: CollaborativeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorLayerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'rectangle' | 'circle' | 'text' | 'line'>('pencil');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [yDoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<Map<number, RemoteUser>>(new Map());
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const user = useAuthStore((state) => state.user);
  const userColor = useRef('#' + Math.floor(Math.random()*16777215).toString(16));
  const localClientId = useRef<number | null>(null);

  useEffect(() => {
    console.log('=== Initializing Canvas Yjs ===');

    const wsProvider = new WebsocketProvider(
      'ws://localhost:5000',
      `whiteboards/${whiteboardId}`,
      yDoc
    );

    wsProvider.on('status', (event: any) => {
      console.log('📡 Canvas WebSocket status:', event.status);
      setConnectionStatus(event.status);
    });

    // Set local user info
    const userName = user?.full_name || user?.email || 'Anonymous';
    wsProvider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor.current,
    });

    localClientId.current = wsProvider.awareness.clientID;

    // Track remote users and their cursors
    const updateRemoteUsers = () => {
      const states = wsProvider.awareness.getStates();
      const users = new Map<number, RemoteUser>();
      
      states.forEach((state, clientId) => {
        if (clientId !== localClientId.current && state.user) {
          users.set(clientId, {
            clientId,
            name: state.user.name || 'Anonymous',
            color: state.user.color || '#000000',
            cursor: state.cursor,
          });
        }
      });

      setRemoteUsers(users);
      setConnectedUsers(states.size);
      console.log('👥 Remote users:', users.size);
    };

    wsProvider.awareness.on('change', updateRemoteUsers);
    updateRemoteUsers();

    const yElements = yDoc.getArray<DrawElement>('elements');

    // Load existing elements
    setElements(yElements.toArray());

    // Listen for remote changes
    yElements.observe(() => {
      setElements(yElements.toArray());
    });

    setProvider(wsProvider);

    return () => {
      wsProvider.awareness.off('change', updateRemoteUsers);
      wsProvider.destroy();
      yDoc.destroy();
    };
  }, [whiteboardId, yDoc, user]);

  // Redraw canvas when elements change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all elements
    elements.forEach((element) => {
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (element.type) {
        case 'line':
          if (element.points && element.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (element.x !== undefined && element.y !== undefined && element.width && element.height) {
            ctx.strokeRect(element.x, element.y, element.width, element.height);
          }
          break;

        case 'circle':
          if (element.x !== undefined && element.y !== undefined && element.width) {
            ctx.beginPath();
            ctx.arc(element.x, element.y, element.width, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case 'arrow':
          if (element.points && element.points.length === 2) {
            const start = element.points[0];
            const end = element.points[1];
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const arrowLength = 15;
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowLength * Math.cos(angle - Math.PI / 6),
              end.y - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowLength * Math.cos(angle + Math.PI / 6),
              end.y - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;

        case 'text':
          if (element.x !== undefined && element.y !== undefined && element.text) {
            ctx.font = '16px sans-serif';
            ctx.fillText(element.text, element.x, element.y);
          }
          break;
      }
    });
  }, [elements]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const updateCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!provider) return;
    const pos = getMousePos(e);
    provider.awareness.setLocalStateField('cursor', pos);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPoint(pos);
    
    if (tool === 'pencil') {
      setCurrentPoints([pos]);
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        addElement({
          id: Math.random().toString(36),
          type: 'text',
          x: pos.x,
          y: pos.y,
          text,
          color: userColor.current,
          userId: user?.id || 'anonymous',
          userName: user?.full_name || user?.email || 'Anonymous',
        });
      }
      setIsDrawing(false);
      setStartPoint(null);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCursor(e);

    if (!isDrawing || !startPoint) return;

    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'pencil') {
      setCurrentPoints((prev) => [...prev, pos]);
      
      ctx.strokeStyle = userColor.current;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const pos = getMousePos(e);

    if (tool === 'pencil' && currentPoints.length > 1) {
      addElement({
        id: Math.random().toString(36),
        type: 'line',
        points: currentPoints,
        color: userColor.current,
        userId: user?.id || 'anonymous',
        userName: user?.full_name || user?.email || 'Anonymous',
      });
    } else if (tool === 'rectangle') {
      addElement({
        id: Math.random().toString(36),
        type: 'rectangle',
        x: Math.min(startPoint.x, pos.x),
        y: Math.min(startPoint.y, pos.y),
        width: Math.abs(pos.x - startPoint.x),
        height: Math.abs(pos.y - startPoint.y),
        color: userColor.current,
        userId: user?.id || 'anonymous',
        userName: user?.full_name || user?.email || 'Anonymous',
      });
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
      );
      addElement({
        id: Math.random().toString(36),
        type: 'circle',
        x: startPoint.x,
        y: startPoint.y,
        width: radius,
        color: userColor.current,
        userId: user?.id || 'anonymous',
        userName: user?.full_name || user?.email || 'Anonymous',
      });
    } else if (tool === 'line') {
      addElement({
        id: Math.random().toString(36),
        type: 'arrow',
        points: [startPoint, pos],
        color: userColor.current,
        userId: user?.id || 'anonymous',
        userName: user?.full_name || user?.email || 'Anonymous',
      });
    }

    setIsDrawing(false);
    setCurrentPoints([]);
    setStartPoint(null);
  };

  const addElement = (element: DrawElement) => {
    const yElements = yDoc.getArray<DrawElement>('elements');
    yElements.push([element]);
  };

  const clearBoard = () => {
    if (!confirm('Clear the entire whiteboard? This cannot be undone.')) return;
    const yElements = yDoc.getArray('elements');
    yElements.delete(0, yElements.length);
  };

  return (
    <div className="border-2 border-border">
      {/* Toolbar */}
      <div className="p-3 border-b-2 border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <Button
              variant={tool === 'pencil' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('pencil')}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Pencil
            </Button>
            <Button
              variant={tool === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('line')}
            >
              <Minus className="h-4 w-4 mr-2" />
              Arrow
            </Button>
            <Button
              variant={tool === 'rectangle' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('rectangle')}
            >
              <Square className="h-4 w-4 mr-2" />
              Rectangle
            </Button>
            <Button
              variant={tool === 'circle' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('circle')}
            >
              <Circle className="h-4 w-4 mr-2" />
              Circle
            </Button>
            <Button
              variant={tool === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('text')}
            >
              <Type className="h-4 w-4 mr-2" />
              Text
            </Button>

            <Separator orientation="vertical" className="h-8" />

            <Button variant="ghost" size="sm" onClick={clearBoard}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus}
            </Badge>
            <Badge variant="secondary">
              {connectedUsers} user{connectedUsers !== 1 ? 's' : ''} online
            </Badge>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={1200}
          height={600}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={() => {
            if (provider) {
              provider.awareness.setLocalStateField('cursor', null);
            }
            if (isDrawing) {
              setIsDrawing(false);
              setCurrentPoints([]);
              setStartPoint(null);
            }
          }}
          className="cursor-crosshair bg-background"
        />

        {/* Remote Cursors Overlay */}
        <div
          ref={cursorLayerRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: '1200px', height: '600px' }}
        >
          {Array.from(remoteUsers.values()).map((remoteUser) => {
            if (!remoteUser.cursor) return null;
            
            return (
              <div
                key={remoteUser.clientId}
                className="absolute transition-all duration-100"
                style={{
                  left: `${remoteUser.cursor.x}px`,
                  top: `${remoteUser.cursor.y}px`,
                  transform: 'translate(-2px, -2px)',
                }}
              >
                {/* Cursor */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.65376 12.3673L8.47998 15.1938L11.3062 18.02L13.7619 15.5644L17.9718 11.3545L11.3062 4.68896L5.65376 12.3673Z"
                    fill={remoteUser.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>

                {/* User Name Label */}
                <div
                  className="absolute left-6 top-0 px-2 py-1 text-xs font-medium text-white whitespace-nowrap shadow-lg"
                  style={{
                    backgroundColor: remoteUser.color,
                  }}
                >
                  {remoteUser.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
