import type { ReactNode } from 'react';

interface StatTileProps {
    label: string;
    value: string;
    sub?: string;
    icon?: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
}

export function StatTile({ label, value, sub, icon, trend }: StatTileProps) {
    const trendColor =
        trend === 'up'   ? 'text-success' :
        trend === 'down' ? 'text-error'   : 'text-muted';

    return (
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted uppercase tracking-wide">{label}</span>
                {icon && <span className="text-muted-2">{icon}</span>}
            </div>
            <div className="text-2xl font-semibold text-ink tabular-nums">{value}</div>
            {sub && <div className={`text-xs ${trendColor}`}>{sub}</div>}
        </div>
    );
}
