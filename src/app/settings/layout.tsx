import type { ReactNode } from 'react';
import { NavSidebar } from '../dashboard/components/NavSidebar';

export default function SettingsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-paper">
            <NavSidebar />
            <main className="flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
