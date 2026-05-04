'use client';

import { useMemo, useRef, useState } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { AnswerSchema } from '@/lib/generation/schema';
import { useQuery } from '../QueryContext';
import { useTheme } from '@/app/ThemeContext';

interface Source {
    number: number;
    chunkId: string;
    documentTitle: string;
    content: string;
}

function parseCitations(text: string): Array<{ type: 'text' | 'cite'; value: string }> {
    const parts: Array<{ type: 'text' | 'cite'; value: string }> = [];
    const re = /\[(\d+)\]/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
        parts.push({ type: 'cite', value: match[1] });
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
    return parts;
}

export function ChatPanel() {
    const { setQueryId, setIsStreaming } = useQuery();
    const [question, setQuestion] = useState('');
    const [sources, setSources] = useState<Source[]>([]);
    const [totalLatencyMs, setTotalLatencyMs] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const streamStartRef = useRef<number>(0);
    const { dark } = useTheme();

    const { submit, object, isLoading, stop } = useObject({
        api: '/api/ask',
        schema: AnswerSchema,
        fetch: async (input, init) => {
            setErrorMsg(null);
            streamStartRef.current = Date.now();
            const response = await fetch(input, init);
            if (!response.ok) {
                const text = await response.clone().text();
                throw new Error(text || `Request failed: ${response.status}`);
            }
            const qid = response.headers.get('X-Query-Id');
            if (qid) {
                setQueryId(qid);
                setIsStreaming(true);
            }
            const rawSources = response.headers.get('X-Sources');
            if (rawSources) {
                try { setSources(JSON.parse(rawSources)); } catch {}
            }
            return response;
        },
        onFinish: () => {
            setIsStreaming(false);
            setTotalLatencyMs(Date.now() - streamStartRef.current);
        },
        onError: (err) => {
            setIsStreaming(false);
            setErrorMsg(err.message);
        },
    });

    function doSubmit() {
        if (!question.trim() || isLoading) return;
        setSources([]);
        setTotalLatencyMs(null);
        setQueryId(null);
        submit({ question });
    }

    function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        doSubmit();
    }

    const answer = object?.answer ?? '';
    const confidence = object?.confidence;

    // Only re-parse when answer text actually changes
    const citationSegments = useMemo(() => parseCitations(answer), [answer]);

    // Derive citedSources directly from object to avoid a new [] reference on every render
    const citedSources = useMemo(
        () => sources.filter((s) => object?.citations?.includes(s.number) ?? false),
        [sources, object?.citations]
    );

    return (
        <main className="flex flex-col flex-1 min-w-0 bg-paper overflow-hidden border-r border-paper-2">
            {/* Top bar */}
            <header className="px-8 py-5 shrink-0">
                <h1 className="text-sm font-medium text-navy-muted mt-0.5">Search across your document corpus</h1>
            
                {/* Input bar — pinned to bottom */}
                <div className="shrink-0 py-4 border-b border-border">
                    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    doSubmit();
                                }
                            }}
                            placeholder="What would you like to know? (Enter to send)"
                            rows={2}
                            className={`flex-1 resize-none rounded-xl border   ${dark ? "border-border" : "border-navy bg-paper-2"} px-4 py-3 text-sm text-navy-muted placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition`}
                            disabled={isLoading}
                        />
                        {isLoading ? (
                            <button
                                type="button"
                                onClick={stop}
                                className="shrink-0 h-11 px-5 rounded-xl bg-error text-white text-sm font-medium hover:bg-red-700 transition"
                            >
                                Stop
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!question.trim()}
                                className={`shrink-0 h-11 px-5 rounded-xl ${dark ? "bg-navy/20 border-navy/20 text-white/80 border hover:bg-navy-muted" : "bg-navy hover:bg-navy-light text-white "} text-sm font-medium transition cursor-pointer`}
                            >
                                Ask
                            </button>
                        )}
                    </form>
                </div>
            </header>
            {/* Scrollable answer area — flex-1 so it fills the space between header and input */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                {/* Empty state */}
                {!isLoading && !answer && !errorMsg && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted pt-16">
                        <svg
                            className="w-12 h-12 mb-4 opacity-30"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.2}
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                            />
                        </svg>
                        <p className="text-sm">Ask a question to get started</p>
                    </div>
                )}

                {/* Error */}
                {errorMsg && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-error">
                        {errorMsg}
                    </div>
                )}

                {/* Streaming / completed answer */}
                {(isLoading || answer) && (
                    <div className="space-y-5">
                        <div className={`p-5 rounded-2xl bg-surface border border-border shadow-sm`}>
                            {answer ? (
                                <p className={`${dark ? "text-muted" : "text-navy-muted"} text-sm`}>
                                    {citationSegments.map((seg, i) =>
                                        seg.type === 'cite' ? (
                                            <sup
                                                key={i}
                                                className={`inline-flex items-center justify-center w-4 h-4 text-[10px] font-mono font-semibold bg-navy/20 ${dark ? "text-muted" : "text-navy"} rounded mx-0.5 align-super`}
                                            >
                                                {seg.value}
                                            </sup>
                                        ) : (
                                            <span key={i}>{seg.value}</span>
                                        )
                                    )}
                                    {isLoading && (
                                        <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                                    )}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <div className="h-3 bg-border rounded animate-pulse w-full" />
                                    <div className="h-3 bg-border rounded animate-pulse w-4/5" />
                                    <div className="h-3 bg-border rounded animate-pulse w-2/3" />
                                </div>
                            )}

                            {!isLoading && confidence !== undefined && totalLatencyMs !== null && (
                                <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-xs font-mono text-muted">
                                    <span>{totalLatencyMs.toLocaleString()}ms</span>
                                    <span>
                                        confidence{' '}
                                        <span
                                            className={
                                                confidence >= 0.7
                                                    ? 'text-success'
                                                    : confidence >= 0.4
                                                    ? 'text-warning'
                                                    : 'text-error'
                                            }
                                        >
                                            {(confidence * 100).toFixed(0)}%
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Source chips */}
                        {!isLoading && citedSources.length > 0 && (
                            <div>
                                <p className="text-xs font-mono uppercase tracking-widest text-muted mb-3">
                                    Sources
                                </p>
                                <div className="space-y-2">
                                    {citedSources.map((s) => (
                                        <div
                                            key={s.chunkId}
                                            className="p-3 rounded-xl border border-border bg-surface text-sm"
                                        >
                                            <p className="font-medium text-navy-muted">
                                                <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-mono font-semibold ${dark ? "bg-navy/20 text-muted" : "bg-navy/20 text-navy"} rounded mr-1.5`}>
                                                    {s.number}
                                                </span>
                                                {s.documentTitle}
                                            </p>
                                            <p className="mt-1.5 text-muted leading-relaxed line-clamp-3">
                                                {s.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            
        </main>
    );
}
