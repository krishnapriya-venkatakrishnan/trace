'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { QueryRow } from '@/lib/dashboard/queries';
import { DrilldownPanel } from './DrilldownPanel';

function msLabel(ms: number | null) {
    if (ms == null) return '—';
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function usd(v: number | null) {
    if (v == null) return '—';
    return `$${v.toFixed(5)}`;
}

function statusBadge(status: string) {
    const map: Record<string, string> = {
        success: 'bg-success/10 text-success',
        error:   'bg-error/10 text-error',
        pending: 'bg-warning/10 text-warning',
    };
    return map[status] ?? 'bg-muted/10 text-muted';
}

export function RecentQueriesTable({ queries }: { queries: QueryRow[] }) {
    const [activeId, setActiveId] = useState<string | null>(null);

    return (
        <>
            <section className="space-y-4">
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Recent Queries</h2>

                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    {queries.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-sm text-muted">
                            No queries yet in this time range.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-paper">
                                        <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wide">Time</th>
                                        <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wide">Question</th>
                                        <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wide">Status</th>
                                        <th className="text-right px-4 py-3 text-xs text-muted font-medium uppercase tracking-wide">Latency</th>
                                        <th className="text-right px-4 py-3 text-xs text-muted font-medium uppercase tracking-wide">Cost</th>
                                        <th className="text-right px-4 py-3 text-xs text-muted font-medium uppercase tracking-wide">Tokens</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queries.map((q) => (
                                        <tr
                                            key={q.id}
                                            onClick={() => setActiveId(q.id)}
                                            className="border-b border-border-soft last:border-0 hover:bg-hover cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                                                {format(new Date(q.created_at), 'MMM d, HH:mm')}
                                            </td>
                                            <td className="px-4 py-3 text-ink max-w-sm">
                                                <span className="line-clamp-1">{q.question}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusBadge(q.status)}`}>
                                                    {q.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted tabular-nums whitespace-nowrap">
                                                {msLabel(q.total_latency_ms)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted tabular-nums whitespace-nowrap">
                                                {usd(q.total_cost_usd)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted tabular-nums whitespace-nowrap">
                                                {q.total_input_tokens != null
                                                    ? `${((q.total_input_tokens + (q.total_output_tokens ?? 0)) / 1000).toFixed(1)}k`
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <DrilldownPanel queryId={activeId} onClose={() => setActiveId(null)} />
        </>
    );
}
