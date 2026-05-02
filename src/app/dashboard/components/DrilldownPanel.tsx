'use client';

import { useState, useEffect, useTransition } from 'react';
import { XIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { getQueryDetail } from '@/lib/dashboard/actions';
import type { QueryDetail, LlmCallDetail } from '@/lib/dashboard/actions';

const phaseOrder = ['embedding', 'retrieval', 'rerank', 'generation'];

function msLabel(ms: number | null) {
    if (ms == null) return '—';
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function usd(v: number | null) {
    if (v == null) return '—';
    return `$${v.toFixed(6)}`;
}

function statusBadge(status: string) {
    const map: Record<string, string> = {
        success: 'bg-success/10 text-success',
        error:   'bg-error/10 text-error',
        pending: 'bg-warning/10 text-warning',
    };
    return map[status] ?? 'bg-muted/10 text-muted';
}

function CallCard({ call }: { call: LlmCallDetail }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-paper hover:bg-hover transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 text-xs font-mono px-2 py-0.5 rounded-full ${statusBadge(call.status)}`}>
                        {call.phase}
                    </span>
                    <span className="text-sm text-ink truncate">{call.model}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs text-muted">
                    <span>{msLabel(call.latency_ms)}</span>
                    <span>{usd(call.cost_usd)}</span>
                    {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                </div>
            </button>

            {open && (
                <div className="px-4 py-3 bg-surface border-t border-border space-y-2 text-sm">
                    <Row label="Input tokens"      value={call.input_tokens?.toLocaleString() ?? '—'} />
                    <Row label="Output tokens"     value={call.output_tokens?.toLocaleString() ?? '—'} />
                    <Row label="Time to first tok" value={msLabel(call.time_to_first_token_ms)} />
                    <Row label="Status"            value={call.status} />
                    {call.error_message && (
                        <div className="mt-2 p-2 rounded bg-error/5 text-error text-xs font-mono">
                            {call.error_message}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-muted">{label}</span>
            <span className="text-ink tabular-nums">{value}</span>
        </div>
    );
}

interface Props {
    queryId: string | null;
    onClose: () => void;
}

export function DrilldownPanel({ queryId, onClose }: Props) {
    const [detail, setDetail] = useState<QueryDetail | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setDetail(null);
        if (!queryId) { return; }
        startTransition(async () => {
            const d = await getQueryDetail(queryId);
            setDetail(d);
        });
    }, [queryId]);

    if (!queryId) return null;

    const sortedCalls = detail
        ? [...detail.calls].sort(
            (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
          )
        : [];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-30"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-surface border-l border-border shadow-2xl z-40 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
                    <h2 className="text-sm font-semibold text-ink">Query Detail</h2>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-ink transition-colors"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {isPending && (
                        <div className="flex items-center justify-center py-16 text-sm text-muted">
                            Loading…
                        </div>
                    )}

                    {!isPending && !detail && (
                        <div className="flex items-center justify-center py-16 text-sm text-error">
                            Failed to load query detail.
                        </div>
                    )}

                    {detail && (
                        <>
                            {/* Question */}
                            <div className="space-y-1">
                                <p className="text-xs text-muted uppercase tracking-wide font-medium">Question</p>
                                <p className="text-sm text-ink leading-relaxed">{detail.question}</p>
                            </div>

                            {/* Meta */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-paper rounded-lg p-3 space-y-1">
                                    <p className="text-xs text-muted">Status</p>
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusBadge(detail.status)}`}>
                                        {detail.status}
                                    </span>
                                </div>
                                <div className="bg-paper rounded-lg p-3 space-y-1">
                                    <p className="text-xs text-muted">Total latency</p>
                                    <p className="font-medium tabular-nums">{msLabel(detail.total_latency_ms)}</p>
                                </div>
                                <div className="bg-paper rounded-lg p-3 space-y-1">
                                    <p className="text-xs text-muted">Total cost</p>
                                    <p className="font-medium tabular-nums">{usd(detail.total_cost_usd)}</p>
                                </div>
                                <div className="bg-paper rounded-lg p-3 space-y-1">
                                    <p className="text-xs text-muted">Tokens (in/out)</p>
                                    <p className="font-medium tabular-nums">
                                        {detail.total_input_tokens?.toLocaleString() ?? '—'} / {detail.total_output_tokens?.toLocaleString() ?? '—'}
                                    </p>
                                </div>
                            </div>

                            {/* Answer */}
                            {detail.answer && (
                                <div className="space-y-1">
                                    <p className="text-xs text-muted uppercase tracking-wide font-medium">Answer</p>
                                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{detail.answer}</p>
                                </div>
                            )}

                            {detail.error_message && (
                                <div className="p-3 rounded-lg bg-error/5 border border-error/20">
                                    <p className="text-xs text-muted mb-1 uppercase tracking-wide font-medium">Error</p>
                                    <p className="text-sm text-error font-mono">{detail.error_message}</p>
                                </div>
                            )}

                            {/* LLM call waterfall */}
                            {sortedCalls.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted uppercase tracking-wide font-medium">LLM Chain</p>
                                    <div className="space-y-2">
                                        {sortedCalls.map((call) => (
                                            <CallCard key={call.id} call={call} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
