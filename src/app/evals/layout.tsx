import type { ReactNode } from 'react';
import { NavSidebar } from '../dashboard/components/NavSidebar';

export default function EvalsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-paper">
            <NavSidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
