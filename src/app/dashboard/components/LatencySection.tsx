'use client';

import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
    Cell,
} from 'recharts';
import type { LatencyRow } from '@/lib/dashboard/queries';

const pColors = { p50: '#3b82f6', p95: '#f59e0b', p99: '#ef4444' };

function msLabel(v: unknown) {
    const n = Number(v);
    return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`;
}

interface HistoBin { range: string; count: number; color: string }

function buildHistogram(rows: LatencyRow[]): HistoBin[] {
    const vals = rows.map((r) => r.p50);
    if (vals.length === 0) return [];
    const max = Math.max(...vals);
    const binCount = Math.min(8, vals.length);
    const step = max / binCount || 1;
    const bins: number[] = Array(binCount).fill(0);
    for (const v of vals) {
        const idx = Math.min(Math.floor(v / step), binCount - 1);
        bins[idx]++;
    }
    const p95 = [...vals].sort((a, b) => a - b)[Math.floor(vals.length * 0.95)] ?? 0;
    return bins.map((count, i) => ({
        range: msLabel(i * step),
        count,
        color: i * step >= p95 ? '#ef4444' : i * step >= p95 * 0.75 ? '#f59e0b' : '#3b82f6',
    }));
}

export function LatencySection({ latencyByDay }: { latencyByDay: LatencyRow[] }) {
    const histo = buildHistogram(latencyByDay);

    return (
        <section className="space-y-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Latency</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Percentile lines */}
                <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5">
                    <p className="text-xs text-muted mb-4 font-medium">Latency Percentiles Over Time</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={latencyByDay} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                            <YAxis tickFormatter={msLabel} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={56} />
                            <Tooltip formatter={(v) => msLabel(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                            {(['p50', 'p95', 'p99'] as const).map((k) => (
                                <Line
                                    key={k}
                                    type="monotone"
                                    dataKey={k}
                                    stroke={pColors[k]}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Histogram */}
                <div className="bg-surface border border-border rounded-xl p-5">
                    <p className="text-xs text-muted mb-4 font-medium">p50 Distribution</p>
                    {histo.length === 0 ? (
                        <div className="flex items-center justify-center h-[220px] text-sm text-muted">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={histo} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                                <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {histo.map((bin, i) => (
                                        <Cell key={i} fill={bin.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </section>
    );
}
