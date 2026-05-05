import type { ReactNode } from 'react';

export default function EvalsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex overflow-hidden bg-paper">
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
