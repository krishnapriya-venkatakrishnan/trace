'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '../QueryContext';
import { useTheme } from '@/app/ThemeContext';

type LLMPhase = 'embedding' | 'retrieval' | 'rerank' | 'generation';

interface LLMCall {
    id: string;
    phase: LLMPhase;
    model: string;
    latency_ms: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    status: 'success' | 'error' | 'timeout';
}

const phaseOrder: LLMPhase[] = ['embedding', 'retrieval', 'rerank', 'generation'];

const phaseMeta: Record<LLMPhase, { label: string; icon: string; description: string }> = {
    embedding: {
        label: 'Embedding',
        icon: '◈',
        description: 'Encode question into vector space',
    },
    retrieval: {
        label: 'Retrieval',
        icon: '⊞',
        description: 'Hybrid search: semantic + BM25',
    },
    rerank: {
        label: 'Re-ranking',
        icon: '⇅',
        description: 'Score passages by relevance',
    },
    generation: {
        label: 'Generation',
        icon: '✦',
        description: 'Compose structured answer',
    },
};

function ThemeToggle() {
    const { dark, toggle } = useTheme();

    return (
        <button
            onClick={toggle}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
            title="Toggle theme"
        >
            {dark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
            )}
            <span>{dark ? 'Light' : 'Dark'}</span>
        </button>
    );
}

function PhaseRow({ phase, call }: { phase: LLMPhase; call: LLMCall | undefined }) {
    const meta = phaseMeta[phase];
    const done = !!call;
    const isError = call?.status === 'error';

    return (
        <div
            className="flex items-start gap-3 transition-all duration-300"
            style={{ opacity: done ? 1 : 0.35 }}
        >
            {/* Icon + connector */}
            <div className="flex flex-col items-center shrink-0">
                <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono border transition-colors duration-300 ${
                        isError
                            ? 'bg-red-50 border-red-300 text-error'
                            : done
                            ? 'bg-accent-dim border-accent/30 text-accent'
                            : 'bg-border border-border text-muted'
                    }`}
                >
                    {meta.icon}
                </div>
                {phase !== 'generation' && (
                    <div className={`w-px flex-1 mt-1 min-h-[20px] transition-colors duration-300 ${done ? 'bg-accent/20' : 'bg-border'}`} />
                )}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{meta.label}</span>
                    {done && !isError && (
                        <span className="text-xs font-mono text-muted tabular-nums">
                            {call!.latency_ms}ms
                        </span>
                    )}
                    {isError && (
                        <span className="text-xs text-error">failed</span>
                    )}
                </div>
                <p className="text-xs text-muted mt-0.5">{meta.description}</p>

                {/* Token / cost details */}
                {done && !isError && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono text-muted/80">
                        {call!.model && (
                            <span className="px-1.5 py-0.5 rounded bg-border">{call!.model}</span>
                        )}
                        {call!.input_tokens > 0 && (
                            <span>↑{call!.input_tokens.toLocaleString()} tok</span>
                        )}
                        {call!.output_tokens > 0 && (
                            <span>↓{call!.output_tokens.toLocaleString()} tok</span>
                        )}
                        {call!.cost_usd > 0 && (
                            <span>${Number(call!.cost_usd).toFixed(5)}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ReasoningPanel() {
    const { queryId, isStreaming } = useQuery();
    const [calls, setCalls] = useState<LLMCall[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!queryId) 
            return;
        
        const supabase = createClient();

        async function poll() {
            const { data } = await supabase
                .from('llm_calls')
                .select('id, phase, model, latency_ms, input_tokens, output_tokens, cost_usd, status')
                .eq('query_id', queryId)
                .order('created_at', { ascending: true });

            if (data) setCalls(data as LLMCall[]);
        }

        poll();
        intervalRef.current = setInterval(poll, 250);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setCalls([]);
        };
    }, [queryId]);

    // Stop polling once streaming ends and all 4 phases are in
    useEffect(() => {
        if (!isStreaming && calls.length >= phaseOrder.length) {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [isStreaming, calls.length]);

    const byPhase = Object.fromEntries(
        phaseOrder.map((p) => [p, calls.find((c) => c.phase === p)])
    ) as Record<LLMPhase, LLMCall | undefined>;

    const totalCost = calls.reduce((s, c) => s + Number(c.cost_usd), 0);
    const totalLatency = calls.reduce((s, c) => s + c.latency_ms, 0);
    const donePhases = phaseOrder.filter((p) => byPhase[p]).length;

    return (
        <aside className="flex flex-col h-full w-80 shrink-0 border-l border-border bg-surface overflow-hidden">
            {/* Header */}
            <div className="px-5 py-5 border-b border-border flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-ink">How this was made</h2>
                    <p className="text-xs text-muted mt-0.5">RAG pipeline trace</p>
                </div>
                <ThemeToggle />
            </div>

            {/* Pipeline timeline */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
                {!queryId && !isStreaming ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted">
                        <div className="text-3xl mb-3 opacity-30">◈</div>
                        <p className="text-sm">Ask a question to see the pipeline trace</p>
                    </div>
                ) : (
                    <div>
                        {phaseOrder.map((phase) => (
                            <PhaseRow key={phase} phase={phase} call={byPhase[phase]} />
                        ))}
                    </div>
                )}
            </div>

            {/* Summary footer */}
            {queryId && donePhases > 0 && (
                <div className="shrink-0 px-5 py-4 border-t border-border bg-paper">
                    <div className="flex justify-between text-xs font-mono text-muted">
                        <span>
                            {donePhases}/{phaseOrder.length} phases
                            {isStreaming && (
                                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            )}
                        </span>
                        <div className="flex gap-3">
                            {totalLatency > 0 && <span>{totalLatency.toLocaleString()}ms</span>}
                            {totalCost > 0 && <span>${totalCost.toFixed(4)}</span>}
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
