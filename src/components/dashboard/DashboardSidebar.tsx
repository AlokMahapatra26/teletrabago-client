import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CompanySelector } from '@/components/company/CompanySelector';
import {
    LayoutDashboard,
    MessageSquare,
    FileText,
    PenTool,
    Video,
    Users,
    Settings,
    LogOut,
    Plus
} from 'lucide-react';
import { User } from '@/store/authStore';
import { ModeToggle } from '@/components/mode-toggle';
import { Separator } from '@/components/ui/separator';

import { CreateCompanyDialog } from '@/components/company/CreateCompanyDialog';

interface DashboardSidebarProps {
    className?: string;
    activeTab: string;
    onTabChange: (tab: string) => void;
    companies: any[];
    selectedCompany: string | null;
    onSelectCompany: (id: string) => void;
    onCompanyCreated: () => void;
    user: User | null;
    onSignOut: () => void;
}

export function DashboardSidebar({
    className,
    activeTab,
    onTabChange,
    companies,
    selectedCompany,
    onSelectCompany,
    onCompanyCreated,
    user,
    onSignOut
}: DashboardSidebarProps) {

    const navItems = [
        { id: 'tasks', label: 'Tasks', icon: LayoutDashboard },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'whiteboards', label: 'Whiteboards', icon: PenTool },
        { id: 'meetings', label: 'Meetings', icon: Video },
        { id: 'members', label: 'Members', icon: Users },
    ];

    return (
        <div className={cn("flex flex-col h-screen w-64 border-r bg-card text-card-foreground", className)}>
            {/* Header / Brand */}
            <div className="p-6">
                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                        T
                    </div>
                    Teletrabago
                </h1>
            </div>

            {/* Company Selector */}
            <div className="px-4 mb-4">
                <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Workspace
                </div>
                <CompanySelector
                    companies={companies}
                    selectedCompany={selectedCompany}
                    onSelectCompany={onSelectCompany}
                />
                {/* We might need a way to trigger create company from here if the selector doesn't have it, 
            but usually selector has it or we add a button below */}
                <div className="mt-2">
                    <CreateCompanyDialog
                        onCompanyCreated={onCompanyCreated}
                        trigger={
                            <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                                <Plus className="mr-2 h-4 w-4" />
                                Create Company
                            </Button>
                        }
                    />
                </div>
            </div>

            <Separator className="my-2 opacity-50" />

            {/* Navigation */}
            <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <Button
                            key={item.id}
                            variant={activeTab === item.id ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start font-medium",
                                activeTab === item.id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => onTabChange(item.id)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Button>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer / User Profile */}
            <div className="p-4 border-t bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                            {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-medium truncate">{user?.full_name || 'User'}</span>
                            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <Button variant="ghost" size="icon" onClick={onSignOut} className="text-muted-foreground hover:text-destructive" title="Sign Out">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
