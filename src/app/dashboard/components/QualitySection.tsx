'use client';

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import type { QualityRow } from '@/lib/dashboard/queries';

function pctLabel(v: unknown) {
    return `${Number(v).toFixed(1)}%`;
}

export function QualitySection({ qualityOverTime }: { qualityOverTime: QualityRow[] }) {
    return (
        <section className="space-y-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Quality</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Success rate area */}
                <div className="bg-surface border border-border rounded-xl p-5">
                    <p className="text-xs text-muted mb-4 font-medium">Success Rate Over Time</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={qualityOverTime} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                            <YAxis domain={[0, 100]} tickFormatter={pctLabel} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={48} />
                            <Tooltip formatter={(v) => pctLabel(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                            <Area
                                type="monotone"
                                dataKey="successRate"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#successGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Line — same data, alternative view */}
                <div className="bg-surface border border-border rounded-xl p-5">
                    <p className="text-xs text-muted mb-4 font-medium">Success Rate Trend</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={qualityOverTime} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                            <YAxis domain={[0, 100]} tickFormatter={pctLabel} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={48} />
                            <Tooltip formatter={(v) => pctLabel(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                            <Line
                                type="monotone"
                                dataKey="successRate"
                                stroke="var(--accent)"
                                strokeWidth={2}
                                dot={{ r: 3, fill: 'var(--accent)' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>
    );
}
