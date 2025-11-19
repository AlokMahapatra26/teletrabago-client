import React from 'react';
import { Separator } from '@/components/ui/separator';


interface DashboardHeaderProps {
    title: string;
    children?: React.ReactNode;
}

export function DashboardHeader({ title, children }: DashboardHeaderProps) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <div className="flex items-center gap-2 mr-auto">
                <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
                {children}
            </div>
        </header>
    );
}
