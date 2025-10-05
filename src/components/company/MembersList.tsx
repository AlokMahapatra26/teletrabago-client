'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/api';
import { Users, Crown, Shield, User as UserIcon } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  role: string;
  users?: {
    email: string;
    full_name?: string;
  };
}

interface MembersListProps {
  companyId: string;
  refreshTrigger?: number;
}

export function MembersList({ companyId, refreshTrigger }: MembersListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (companyId) {
      fetchMembers();
    }
  }, [companyId, refreshTrigger]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiRequest(`/api/companies/${companyId}/members`);
      setMembers(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Team Members</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin border-2 border-current border-r-transparent rounded-full"></div>
          Loading members...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Team Members</h3>
        </div>
        <p className="text-sm text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Team Members</h3>
        </div>
        <Card className="p-6 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No members yet. Add team members to get started.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Team Members</h3>
        <Badge variant="secondary" className="ml-auto">
          {members.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {members.map((member) => {
          const displayName = member.users?.full_name || member.users?.email || 'Unknown User';
          const initials = getInitials(member.users?.full_name, member.users?.email);
          
          return (
            <Card
              key={member.id}
              className="p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-border">
                  <AvatarFallback className="text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {displayName}
                  </p>
                  {member.users?.full_name && member.users?.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {member.users.email}
                    </p>
                  )}
                </div>

                <Badge 
                  variant={getRoleBadgeVariant(member.role)}
                  className="shrink-0 gap-1"
                >
                  {getRoleIcon(member.role)}
                  <span className="capitalize">{member.role}</span>
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
