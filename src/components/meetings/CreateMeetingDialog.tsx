'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest } from '@/lib/api';
import { Plus, Video } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  users?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface CreateMeetingDialogProps {
  companyId: string;
  onMeetingCreated: () => void;
}

export function CreateMeetingDialog({ companyId, onMeetingCreated }: CreateMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open]);

  const fetchMembers = async () => {
    try {
      const response = await apiRequest(`/api/companies/${companyId}/members`);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const scheduled_time = formData.get('scheduled_time') as string;
    const duration_minutes = parseInt(formData.get('duration_minutes') as string);

    try {
      await apiRequest('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          title,
          description,
          scheduled_time: new Date(scheduled_time).toISOString(),
          duration_minutes,
          participant_ids: selectedParticipants,
        }),
      });

      setOpen(false);
      setSelectedParticipants([]);
      onMeetingCreated();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Team Standup"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Discuss project updates..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled_time">Date & Time</Label>
              <Input
                id="scheduled_time"
                name="scheduled_time"
                type="datetime-local"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                defaultValue={60}
                min={15}
                step={15}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Invite Participants</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border-2 border-border p-3">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-2">
                  <Checkbox
                    id={member.user_id}
                    checked={selectedParticipants.includes(member.user_id)}
                    onCheckedChange={() => toggleParticipant(member.user_id)}
                  />
                  <label
                    htmlFor={member.user_id}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {member.users?.full_name || member.users?.email || 'Unknown'}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Meeting'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
