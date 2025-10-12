'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface DeleteCompanyDialogProps {
  companyId: string;
  companyName: string;
  userRole: string | null;
  onCompanyDeleted: () => void;
}

export function DeleteCompanyDialog({
  companyId,
  companyName,
  userRole,
  onCompanyDeleted,
}: DeleteCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Only owners can delete
  if (userRole !== 'owner') {
    return null;
  }

  const handleDelete = async () => {
    if (confirmText !== companyName) {
      return;
    }

    setLoading(true);
    try {
      await apiRequest(`/api/companies/${companyId}`, {
        method: 'DELETE',
      });

      console.log('Company deleted successfully');
      setOpen(false);
      setConfirmText('');
      onCompanyDeleted();
    } catch (error: any) {
      console.error('Failed to delete company:', error);
      alert(error.message || 'Failed to delete company');
    } finally {
      setLoading(false);
    }
  };

  const isConfirmValid = confirmText === companyName;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className='cursor-pointer'>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Company</AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="text-destructive font-semibold">
            ⚠️ This action cannot be undone!
          </div>
          
          <div>
            This will permanently delete <strong className="text-foreground">{companyName}</strong> and all associated data including:
          </div>
          
          <ul className="list-disc list-inside space-y-1">
            <li>All team members</li>
            <li>All tasks and boards</li>
            <li>All chat messages</li>
            <li>All documents</li>
            <li>All whiteboards</li>
            <li>All meetings</li>
          </ul>

          <div className="pt-2">
            <Label htmlFor="confirm-text" className="text-foreground">
              Type <strong>{companyName}</strong> to confirm:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={companyName}
              className="mt-2"
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmValid || loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Company'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
