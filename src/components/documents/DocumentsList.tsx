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
import { FileText, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Document {
  id: string;
  title: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

interface DocumentsListProps {
  companyId: string;
  onSelectDocument: (document: Document) => void;
  selectedDocumentId?: string;
}

export function DocumentsList({ companyId, onSelectDocument, selectedDocumentId }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchDocuments();
    }
  }, [companyId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/documents?company_id=${companyId}`);
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;

    try {
      const data = await apiRequest('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          title: title || 'Untitled Document',
        }),
      });

      setDocuments((prev) => [data.document, ...prev]);
      setOpen(false);
      onSelectDocument(data.document);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Failed to create document:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await apiRequest(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin border-2 border-current border-r-transparent"></div>
          Loading documents...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Documents</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Enter document title..."
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? 'Creating...' : 'Create Document'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No documents yet</p>
          </div>
        ) : (
          documents.map((document) => (
            <div
              key={document.id}
              className={`p-3 border-2 border-border hover:bg-muted/50 cursor-pointer transition-colors group ${
                selectedDocumentId === document.id ? 'bg-muted border-primary' : ''
              }`}
              onClick={() => onSelectDocument(document)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-medium text-sm truncate">{document.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(document.id);
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
