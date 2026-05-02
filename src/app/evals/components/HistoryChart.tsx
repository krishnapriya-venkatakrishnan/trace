'use client';

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ReferenceLine,
} from 'recharts';
import type { HistoryPoint } from '@/lib/evaluation/types';

interface TooltipPayload {
    date: string;
    passRate: number;
    passed: number;
    total: number;
    versionLabel?: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: TooltipPayload }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs shadow-md">
            <p className="text-muted mb-1">{label}</p>
            <p className="text-ink font-medium">{d.passRate.toFixed(0)}% pass rate</p>
            <p className="text-muted">{d.passed} / {d.total} tests</p>
            {d.versionLabel && <p className="text-accent mt-1">Prompt {d.versionLabel}</p>}
        </div>
    );
}

export function HistoryChart({ data }: { data: HistoryPoint[] }) {
    if (data.length === 0) {
        return (
            <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-center h-40 text-sm text-muted">
                No history yet — run evaluations to populate this chart.
            </div>
        );
    }

    const transitions = data.filter((d) => d.versionLabel != null);

    return (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted font-medium uppercase tracking-wide">Pass-rate history</p>
                <p className="text-xs text-muted">{data.length} days · annotated with prompt versions</p>
            </div>

            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}    />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                    <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10, fill: 'var(--muted)' }}
                        width={36}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {transitions.map((d) => (
                        <ReferenceLine
                            key={d.date}
                            x={d.date}
                            stroke="var(--muted)"
                            strokeDasharray="3 3"
                            label={{ value: d.versionLabel, position: 'insideTopLeft', fontSize: 9, fill: 'var(--muted)' }}
                        />
                    ))}
                    <Area
                        type="monotone"
                        dataKey="passRate"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        fill="url(#histGrad)"
                        dot={false}
                        activeDot={{ r: 3, fill: 'var(--accent)' }}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-muted font-mono">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-accent inline-block" />
                    pass rate
                </span>
                {transitions.length > 0 && (
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-0 border-t border-dashed border-muted inline-block" />
                        prompt version change
                    </span>
                )}
            </div>
        </div>
    );
}
