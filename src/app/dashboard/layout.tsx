import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-paper">
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
