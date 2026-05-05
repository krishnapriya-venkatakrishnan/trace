'use client';

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
    Cell,
} from 'recharts';
import type { CostByPhaseRow, CostByModelRow } from '@/lib/dashboard/queries';

const phaseColors: Record<string, string> = {
    embedding:  'rgba(58, 30, 138, 0.5)',
    retrieval:  'rgba(30, 58, 138, 0.5)',
    rerank:     'rgba(138, 58, 30, 0.5)',
    generation: 'rgba(58, 138, 30, 1)',
};

function fmt(v: number) {
    if (v >= 1) return `$${v.toFixed(2)}`;
    return `$${(v * 100).toFixed(3)}¢`;
}

function usd(v: unknown) {
    return `$${Number(v).toFixed(4)}`;
}

interface Props {
    costByPhase: CostByPhaseRow[];
    costByModel: CostByModelRow[];
}

export function CostSection({ costByPhase, costByModel }: Props) {
    return (
        <section className="space-y-4">
            <h2 className="text-sm font-semibold text-navy-muted uppercase tracking-wide">Cost</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Stacked area — cost over time by phase */}
                <div className="lg:col-span-2 bg-paper border border-border rounded-xl p-5">
                    <p className="text-xs text-muted mb-4 font-medium">Cost by Phase Over Time</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={costByPhase} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                            <YAxis tickFormatter={usd} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={60} />
                            <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--ink)' }} cursor={{ fill: 'transparent' }} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                            {(['embedding', 'retrieval', 'rerank', 'generation'] as const).map((phase, index) => (
                                <Area
                                    key={phase}
                                    type="monotone"
                                    dataKey={phase}
                                    stackId="1"
                                    stroke={phaseColors[phase]}
                                    fill={phaseColors[phase]}
                                    fillOpacity={0.6}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Horizontal bar — cost by model */}
                <div className="bg-paper border border-border rounded-xl p-5">
                    <p className="text-xs text-muted mb-4 font-medium">Cost by Model</p>
                    {costByModel.length === 0 ? (
                        <div className="flex items-center justify-center h-[220px] text-sm text-muted">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart
                                data={costByModel}
                                layout="vertical"
                                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                            >
                                <XAxis type="number" tickFormatter={usd} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                                <YAxis dataKey="model" type="category" tick={{ fontSize: 11, fill: 'var(--muted)' }} width={80} />
                                <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--ink)' }} itemStyle={{ color: 'var(--ink)' }} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                                    {costByModel.map((_, i) => (
                                        <Cell key={i} fill="rgba(138, 58, 138, 0.5)" />
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
