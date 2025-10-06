'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/api';
import { Video, Calendar, Clock, Users, Trash2, ExternalLink } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduled_time: string;
  duration_minutes: number;
  meeting_url?: string;
  room_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_user?: {
    full_name?: string;
    email: string;
  };
  participants?: Array<{
    id: string;
    user_id: string;
    status: string;
    users: {
      id: string;
      email: string;
      full_name?: string;
    };
  }>;
}

interface MeetingsListProps {
  companyId: string;
  refreshTrigger?: number;
}

export function MeetingsList({ companyId, refreshTrigger }: MeetingsListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchMeetings();
    }
  }, [companyId, refreshTrigger]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/meetings?company_id=${companyId}`);
      console.log('Fetched meetings:', data.meetings);
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (meeting: Meeting) => {
    try {
      console.log('=== Joining Meeting ===');
      console.log('Meeting ID:', meeting.id);
      console.log('Room Name:', meeting.room_name);
      
      if (!meeting.room_name) {
        alert('This meeting room is not available. Please create a new meeting.');
        return;
      }

      // Call join API to update participant status
      await apiRequest(`/api/meetings/${meeting.id}/join`, {
        method: 'POST',
      });
      
      console.log('✓ Join API called successfully');
      console.log('Navigating to:', `/meeting/${meeting.room_name}`);
      
      // Navigate to video call room
      window.location.href = `/meeting/${meeting.room_name}`;
    } catch (error) {
      console.error('Failed to join meeting:', error);
      alert('Failed to join meeting. Please try again.');
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      await apiRequest(`/api/meetings/${id}`, {
        method: 'DELETE',
      });
      fetchMeetings();
    } catch (error) {
      console.error('Failed to delete meeting:', error);
    }
  };

  const getMeetingStatus = (scheduledTime: string) => {
    const meetingDate = new Date(scheduledTime);
    const now = new Date();
    const diff = meetingDate.getTime() - now.getTime();
    const diffMinutes = diff / (1000 * 60);

    if (isPast(meetingDate) && diffMinutes < -60) {
      return { label: 'Ended', variant: 'secondary' as const };
    } else if (diffMinutes <= 15 && diffMinutes >= -15) {
      return { label: 'Live Now', variant: 'default' as const };
    } else if (isToday(meetingDate)) {
      return { label: 'Today', variant: 'default' as const };
    } else if (isTomorrow(meetingDate)) {
      return { label: 'Tomorrow', variant: 'outline' as const };
    } else {
      return { label: 'Upcoming', variant: 'outline' as const };
    }
  };

  const getTimeDisplay = (scheduledTime: string) => {
    const meetingDate = new Date(scheduledTime);
    if (isToday(meetingDate)) {
      return `Today at ${format(meetingDate, 'h:mm a')}`;
    } else if (isTomorrow(meetingDate)) {
      return `Tomorrow at ${format(meetingDate, 'h:mm a')}`;
    } else {
      return format(meetingDate, 'MMM d, yyyy - h:mm a');
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin border-2 border-current border-r-transparent"></div>
          Loading meetings...
        </div>
      </Card>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">No meetings scheduled</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => {
        const status = getMeetingStatus(meeting.scheduled_time);
        const canJoin = true; // Allow joining anytime for testing

        return (
          <Card key={meeting.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">{meeting.title}</h3>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                {meeting.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {meeting.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {getTimeDisplay(meeting.scheduled_time)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {meeting.duration_minutes} minutes
                  </div>
                  {meeting.participants && meeting.participants.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Room Name for debugging */}
                <div className="text-xs text-muted-foreground mb-3">
                  Room: {meeting.room_name}
                </div>

                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center gap-2">
                    {meeting.participants.slice(0, 5).map((participant, idx) => {
                      const name = participant.users.full_name || participant.users.email;
                      const initials = name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <Avatar key={idx} className="h-8 w-8 border-2 border-border">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                      );
                    })}
                    {meeting.participants.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{meeting.participants.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleJoinMeeting(meeting)}
                  disabled={!meeting.room_name}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteMeeting(meeting.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
