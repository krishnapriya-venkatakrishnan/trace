'use client';

import { useState, useMemo, useRef } from 'react';
import {
    PlayIcon, RotateCwIcon, CheckIcon, XIcon, MinusIcon,
    ChevronDownIcon, ChevronRightIcon, ArrowUpIcon, ArrowDownIcon, ArrowRightIcon,
} from 'lucide-react';
import { runSingleEval } from '@/lib/evaluation/actions';
import { HistoryChart } from './HistoryChart';
import type { EvalCase, EvalRunRow, HistoryPoint } from '@/lib/evaluation/types';

// ─── helpers ─────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'pass' | 'fail';
type SortField = 'default' | 'score' | 'status' | 'latency' | 'cost';
type SortDir = 'asc' | 'desc';

function groupRunsByEval(runs: EvalRunRow[]): Map<string, EvalRunRow[]> {
    const map = new Map<string, EvalRunRow[]>();
    for (const r of runs) {
        const arr = map.get(r.evaluation_id) ?? [];
        arr.push(r);
        map.set(r.evaluation_id, arr);
    }
    return map;
}

function fmtMs(ms: number | null | undefined) {
    if (ms == null) return '—';
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function fmtUsd(v: number | null | undefined) {
    if (v == null) return '—';
    return `$${v.toFixed(4)}`;
}

function pct(v: number | null) {
    if (v == null) return '—';
    return `${Math.round(v * 100)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortHeader({
    label, field, current, dir, onClick,
}: { label: string; field: SortField; current: SortField; dir: SortDir; onClick: (f: SortField) => void }) {
    const active = current === field;
    return (
        <button
            onClick={() => onClick(field)}
            className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink-2'}`}
        >
            {label}
            {active && (dir === 'asc' ? <ArrowUpIcon size={10} /> : <ArrowDownIcon size={10} />)}
        </button>
    );
}

function DeltaBadge({ prev, curr }: { prev: EvalRunRow | undefined; curr: EvalRunRow | undefined }) {
    if (!curr) return <span className="text-xs text-muted font-mono">—</span>;
    if (!prev) return <span className="text-xs text-muted-2 font-mono flex items-center gap-0.5"><MinusIcon size={10} /> first run</span>;

    if (curr.passed && !prev.passed)
        return <span className="text-xs text-success font-mono flex items-center gap-0.5"><ArrowUpIcon size={10} /> now passing</span>;
    if (!curr.passed && prev.passed)
        return <span className="text-xs text-error font-mono flex items-center gap-0.5"><ArrowDownIcon size={10} /> regressed</span>;

    const scoreDelta = (curr.score ?? 0) - (prev.score ?? 0);
    if (Math.abs(scoreDelta) >= 0.01) {
        const sign = scoreDelta > 0 ? '+' : '';
        const cls = scoreDelta > 0 ? 'text-success' : 'text-error';
        return <span className={`text-xs font-mono flex items-center gap-0.5 ${cls}`}>{scoreDelta > 0 ? <ArrowUpIcon size={10} /> : <ArrowDownIcon size={10} />}{sign}{pct(scoreDelta)}</span>;
    }

    return <span className="text-xs text-muted-2 font-mono flex items-center gap-0.5"><ArrowRightIcon size={10} /> stable</span>;
}

function EvalRow({
    index, evalCase, latest, previous, sessionResult, isRunning, onRun,
}: {
    index: number;
    evalCase: EvalCase;
    latest: EvalRunRow | undefined;
    previous: EvalRunRow | undefined;
    sessionResult: EvalRunRow | undefined;
    isRunning: boolean;
    onRun: () => void;
}) {
    const [open, setOpen] = useState(false);
    const displayResult = sessionResult ?? latest;
    const diffBase = sessionResult ? latest : previous;

    const statusDot = !displayResult
        ? 'bg-muted/30'
        : displayResult.passed
            ? 'bg-success'
            : 'bg-error';

    return (
        <div className={`border-b border-border-soft last:border-0 ${open ? 'bg-hover' : ''}`}>
            {/* Main row */}
            <div
                className="grid items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-hover transition-colors"
                style={{ gridTemplateColumns: '8px 36px 1fr 72px 80px 90px 110px 32px' }}
                onClick={() => setOpen((o) => !o)}
            >
                {/* Status dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />

                {/* ID */}
                <span className="text-xs text-muted font-mono">T-{String(index + 1).padStart(2, '0')}</span>

                {/* Question */}
                <span className="text-sm text-ink truncate min-w-0">{evalCase.question}</span>

                {/* Latency */}
                <span className="text-xs text-muted font-mono text-right">
                    {isRunning ? <span className="animate-pulse">…</span> : fmtMs(displayResult?.latency_ms)}
                </span>

                {/* Cost */}
                <span className="text-xs text-muted font-mono text-right">
                    {isRunning ? <span className="animate-pulse">…</span> : fmtUsd(displayResult?.cost_usd)}
                </span>

                {/* Status */}
                <span className="text-right">
                    {isRunning ? (
                        <span className="text-xs text-muted animate-pulse">running…</span>
                    ) : displayResult ? (
                        <span className={`text-xs font-mono font-medium ${displayResult.passed ? 'text-success' : 'text-error'}`}>
                            {displayResult.passed ? 'PASS' : 'FAIL'} · {pct(displayResult.score)}
                        </span>
                    ) : (
                        <span className="text-xs text-muted">—</span>
                    )}
                </span>

                {/* Delta */}
                <span className="flex justify-end">
                    <DeltaBadge prev={diffBase} curr={displayResult} />
                </span>

                {/* Expand / run */}
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRun(); }}
                        disabled={isRunning}
                        title="Run"
                        className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-paper disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        {isRunning ? <RotateCwIcon size={11} className="animate-spin" /> : <PlayIcon size={11} />}
                    </button>
                    <span className="text-muted">
                        {open ? <ChevronDownIcon size={13} /> : <ChevronRightIcon size={13} />}
                    </span>
                </div>
            </div>

            {/* Expanded detail */}
            {open && (
                <div className="px-12 pb-4 pt-1 border-t border-border-soft space-y-4">
                    {/* Expected checks */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs text-muted uppercase tracking-wide font-medium mb-2">Expected</p>
                            <div className="space-y-1 text-xs font-mono text-ink-2">
                                {(evalCase.expected_properties.must_mention ?? []).length > 0 && (
                                    <div className="flex items-start gap-2">
                                        {displayResult
                                            ? (displayResult.failure_reasons.some(r => r.startsWith('Missing'))
                                                ? <XIcon size={10} className="text-error mt-0.5 shrink-0" />
                                                : <CheckIcon size={10} className="text-success mt-0.5 shrink-0" />)
                                            : <MinusIcon size={10} className="text-muted mt-0.5 shrink-0" />}
                                        must mention: {evalCase.expected_properties.must_mention!.join(', ')}
                                    </div>
                                )}
                                {evalCase.expected_properties.must_cite && (
                                    <div className="flex items-start gap-2">
                                        {displayResult
                                            ? (displayResult.failure_reasons.some(r => r.includes('citation'))
                                                ? <XIcon size={10} className="text-error mt-0.5 shrink-0" />
                                                : <CheckIcon size={10} className="text-success mt-0.5 shrink-0" />)
                                            : <MinusIcon size={10} className="text-muted mt-0.5 shrink-0" />}
                                        must cite ≥1 source
                                    </div>
                                )}
                                {evalCase.expected_properties.min_confidence != null && (
                                    <div className="flex items-start gap-2">
                                        {displayResult
                                            ? (displayResult.failure_reasons.some(r => r.includes('Confidence'))
                                                ? <XIcon size={10} className="text-error mt-0.5 shrink-0" />
                                                : <CheckIcon size={10} className="text-success mt-0.5 shrink-0" />)
                                            : <MinusIcon size={10} className="text-muted mt-0.5 shrink-0" />}
                                        confidence ≥ {pct(evalCase.expected_properties.min_confidence)}
                                    </div>
                                )}
                                {evalCase.expected_properties.max_length != null && (
                                    <div className="flex items-start gap-2">
                                        {displayResult
                                            ? (displayResult.failure_reasons.some(r => r.includes('length'))
                                                ? <XIcon size={10} className="text-error mt-0.5 shrink-0" />
                                                : <CheckIcon size={10} className="text-success mt-0.5 shrink-0" />)
                                            : <MinusIcon size={10} className="text-muted mt-0.5 shrink-0" />}
                                        max length {evalCase.expected_properties.max_length} chars
                                    </div>
                                )}
                            </div>
                        </div>

                        {displayResult && (
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wide font-medium mb-2">Result detail</p>
                                {displayResult.failure_reasons.length > 0 ? (
                                    <ul className="space-y-1">
                                        {displayResult.failure_reasons.map((r, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-error font-mono">
                                                <XIcon size={10} className="mt-0.5 shrink-0" />
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-success font-mono">
                                        <CheckIcon size={10} />
                                        All checks passed
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer meta */}
                    {displayResult && (
                        <div className="flex gap-5 text-xs text-muted font-mono pt-1 border-t border-border-soft">
                            <span>latency <span className="text-ink">{fmtMs(displayResult.latency_ms)}</span></span>
                            <span>cost <span className="text-ink">{fmtUsd(displayResult.cost_usd)}</span></span>
                            {displayResult.prompt_version != null && <span>prompt <span className="text-ink">v{displayResult.prompt_version}</span></span>}
                            {displayResult.query_id && <span>trace <span className="text-ink">{displayResult.query_id.slice(0, 8)}…</span></span>}
                            <span>{new Date(displayResult.created_at).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    initialEvals: EvalCase[];
    initialRuns: EvalRunRow[];
    historyData: HistoryPoint[];
}

export function EvalsClient({ initialEvals, initialRuns, historyData }: Props) {
    const [sessionResults, setSessionResults] = useState<Map<string, EvalRunRow>>(new Map());
    const [runningId, setRunningId] = useState<string | null>(null);
    const [runAllProgress, setRunAllProgress] = useState<{ done: number; total: number } | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<number | 'all'>('all');
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [sortField, setSortField] = useState<SortField>('default');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const runStartRef = useRef<number>(0);
    const [lastRunStats, setLastRunStats] = useState<{ passed: number; total: number; cost: number; avgLatencyMs: number; durationMs: number } | null>(null);

    const runsByEval = useMemo(() => groupRunsByEval(initialRuns), [initialRuns]);

    const promptVersions = useMemo(() => {
        const vs = new Set<number>();
        for (const r of initialRuns) { if (r.prompt_version != null) vs.add(r.prompt_version); }
        return Array.from(vs).sort((a, b) => b - a);
    }, [initialRuns]);

    function getRunsForEval(evalId: string): [EvalRunRow | undefined, EvalRunRow | undefined] {
        const all = runsByEval.get(evalId) ?? [];
        const filtered = selectedVersion === 'all' ? all : all.filter((r) => r.prompt_version === selectedVersion);
        return [filtered[0], filtered[1]];
    }

    // Precompute display result for each eval (for sort/filter)
    const displayMap = useMemo(() => {
        const m = new Map<string, EvalRunRow | undefined>();
        for (const e of initialEvals) {
            const [latest] = getRunsForEval(e.id);
            m.set(e.id, sessionResults.get(e.id) ?? latest);
        }
        return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialEvals, sessionResults, runsByEval, selectedVersion]);

    function toggleSort(field: SortField) {
        if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('desc'); }
    }

    const filteredSorted = useMemo(() => {
        let list = [...initialEvals];

        // Filter
        if (filter !== 'all') {
            list = list.filter((e) => {
                const r = displayMap.get(e.id);
                if (!r) return false;
                return filter === 'pass' ? r.passed : !r.passed;
            });
        }

        // Sort
        if (sortField !== 'default') {
            list.sort((a, b) => {
                const ra = displayMap.get(a.id);
                const rb = displayMap.get(b.id);
                let va = 0, vb = 0;
                if (sortField === 'score')   { va = ra?.score ?? -1; vb = rb?.score ?? -1; }
                if (sortField === 'status')  { va = ra?.passed ? 1 : 0; vb = rb?.passed ? 1 : 0; }
                if (sortField === 'latency') { va = ra?.latency_ms ?? Infinity; vb = rb?.latency_ms ?? Infinity; }
                if (sortField === 'cost')    { va = ra?.cost_usd ?? -1; vb = rb?.cost_usd ?? -1; }
                return sortDir === 'asc' ? va - vb : vb - va;
            });
        }

        return list;
    }, [initialEvals, displayMap, filter, sortField, sortDir]);

    // Count for filter pills
    const counts = useMemo(() => {
        let pass = 0, fail = 0;
        for (const e of initialEvals) {
            const r = displayMap.get(e.id);
            if (!r) continue;
            if (r.passed) pass++; else fail++;
        }
        return { pass, fail, all: initialEvals.length };
    }, [initialEvals, displayMap]);

    // Original order index (for T-0N labels, independent of sort)
    const originalIndex = useMemo(() => new Map(initialEvals.map((e, i) => [e.id, i])), [initialEvals]);

    async function runSingle(evalCase: EvalCase) {
        setRunningId(evalCase.id);
        try {
            const result = await runSingleEval(evalCase);
            setSessionResults((prev) => new Map(prev).set(evalCase.id, result));
        } finally {
            setRunningId(null);
        }
    }

    async function runAll() {
        const active = initialEvals.filter((e) => e.is_active);
        setRunAllProgress({ done: 0, total: active.length });
        setLastRunStats(null);
        runStartRef.current = Date.now();

        let totalCost = 0;
        let totalLatency = 0;
        let latencyCount = 0;

        for (let i = 0; i < active.length; i++) {
            setRunAllProgress({ done: i, total: active.length });
            setRunningId(active[i].id);
            try {
                const result = await runSingleEval(active[i]);
                setSessionResults((prev) => new Map(prev).set(active[i].id, result));
                totalCost += result.cost_usd ?? 0;
                if (result.latency_ms != null) { totalLatency += result.latency_ms; latencyCount++; }
            } catch { /* continue */ }
        }

        setRunningId(null);
        setRunAllProgress(null);

        // Compute session stats after all done
        setSessionResults((prev) => {
            const results = Array.from(prev.values());
            const passed = results.filter((r) => r.passed).length;
            setLastRunStats({
                passed,
                total: results.length,
                cost: totalCost,
                avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : 0,
                durationMs: Date.now() - runStartRef.current,
            });
            return prev;
        });
    }

    const isAnyRunning = runningId !== null;

    // vs prev: compare session results to the stored initial results
    const vsPrev = useMemo(() => {
        if (sessionResults.size === 0) return null;
        let delta = 0;
        for (const [id, newResult] of sessionResults.entries()) {
            const [oldResult] = getRunsForEval(id);
            if (!oldResult) continue;
            if (newResult.passed && !oldResult.passed) delta++;
            if (!newResult.passed && oldResult.passed) delta--;
        }
        return delta;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionResults, runsByEval, selectedVersion]);

    return (
        <div className="px-8 py-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-semibold text-ink">Evaluations</h1>
                    <p className="text-sm text-muted">
                        {initialEvals.length} test cases
                        {lastRunStats && (
                            <> · <span className={lastRunStats.passed === lastRunStats.total ? 'text-success' : 'text-error'}>{lastRunStats.passed}/{lastRunStats.total} passed</span></>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {promptVersions.length > 0 && (
                        <select
                            value={selectedVersion}
                            onChange={(e) => setSelectedVersion(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="text-xs border border-border rounded-lg px-3 py-1.5 bg-surface text-ink font-mono"
                        >
                            <option value="all">all versions</option>
                            {promptVersions.map((v) => <option key={v} value={v}>prompt v{v}</option>)}
                        </select>
                    )}
                    <button
                        onClick={runAll}
                        disabled={isAnyRunning || initialEvals.length === 0}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {runAllProgress ? (
                            <><RotateCwIcon size={14} className="animate-spin" />{runAllProgress.done}/{runAllProgress.total}</>
                        ) : (
                            <><PlayIcon size={14} />Run all</>
                        )}
                    </button>
                </div>
            </div>

            {/* Run stats bar — shown after a full run */}
            {lastRunStats && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 bg-surface border border-border rounded-xl text-xs font-mono">
                    <span className={`font-medium ${lastRunStats.passed === lastRunStats.total ? 'text-success' : 'text-error'}`}>
                        {lastRunStats.passed}/{lastRunStats.total} passed
                    </span>
                    {vsPrev != null && vsPrev !== 0 && (
                        <span className={vsPrev > 0 ? 'text-success' : 'text-error'}>
                            vs prev {vsPrev > 0 ? '+' : ''}{vsPrev}
                        </span>
                    )}
                    <span className="text-muted">duration <span className="text-ink">{(lastRunStats.durationMs / 1000).toFixed(1)}s</span></span>
                    <span className="text-muted">total cost <span className="text-ink">${lastRunStats.cost.toFixed(4)}</span></span>
                    <span className="text-muted">avg latency <span className="text-ink">{fmtMs(lastRunStats.avgLatencyMs)}</span></span>
                </div>
            )}

            {/* Filter pills + sort */}
            {initialEvals.length > 0 && (
                <div className="flex items-center justify-between gap-4">
                    {/* Filter pills */}
                    <div className="flex gap-1 p-1 rounded-lg bg-paper-2">
                        {([['all', 'All', counts.all], ['pass', 'Pass', counts.pass], ['fail', 'Fail', counts.fail]] as const).map(([val, label, count]) => (
                            <button
                                key={val}
                                onClick={() => setFilter(val)}
                                className={`px-3 py-1 text-xs rounded-md transition-colors font-medium flex items-center gap-1.5 ${filter === val ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                            >
                                {label}
                                <span className={`font-mono ${filter === val ? 'text-muted' : 'text-muted-2'}`}>{count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Sort controls */}
                    <div className="flex items-center gap-1 text-xs text-muted">
                        <span className="mr-1">sort:</span>
                        {([['score', 'Score'], ['status', 'Status'], ['latency', 'Latency'], ['cost', 'Cost']] as [SortField, string][]).map(([f, l]) => (
                            <SortHeader key={f} label={l} field={f} current={sortField} dir={sortDir} onClick={toggleSort} />
                        ))}
                        {sortField !== 'default' && (
                            <button onClick={() => { setSortField('default'); }} className="ml-2 text-muted-2 hover:text-ink">reset</button>
                        )}
                    </div>
                </div>
            )}

            {/* Eval table */}
            {initialEvals.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <MinusIcon size={28} className="text-muted" />
                    <p className="text-sm text-muted">No evaluation cases yet.</p>
                    <p className="text-xs text-muted">
                        Run <code className="font-mono bg-paper px-1.5 py-0.5 rounded">npx tsx src/lib/evaluation/seed.ts</code> to seed 10 cases.
                    </p>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    {/* Column headers */}
                    <div
                        className="grid items-center gap-3 px-5 py-2.5 border-b border-border bg-paper text-xs text-muted font-medium uppercase tracking-wide"
                        style={{ gridTemplateColumns: '8px 36px 1fr 72px 80px 90px 110px 32px' }}
                    >
                        <span />
                        <span>ID</span>
                        <span>Question</span>
                        <SortHeader label="Latency" field="latency" current={sortField} dir={sortDir} onClick={toggleSort} />
                        <SortHeader label="Cost" field="cost" current={sortField} dir={sortDir} onClick={toggleSort} />
                        <SortHeader label="Status" field="status" current={sortField} dir={sortDir} onClick={toggleSort} />
                        <SortHeader label="Δ vs prev" field="score" current={sortField} dir={sortDir} onClick={toggleSort} />
                        <span />
                    </div>

                    {filteredSorted.length === 0 ? (
                        <div className="flex items-center justify-center py-10 text-sm text-muted">
                            No {filter} evaluations
                        </div>
                    ) : (
                        filteredSorted.map((evalCase) => {
                            const [latest, previous] = getRunsForEval(evalCase.id);
                            return (
                                <EvalRow
                                    key={evalCase.id}
                                    index={originalIndex.get(evalCase.id) ?? 0}
                                    evalCase={evalCase}
                                    latest={latest}
                                    previous={previous}
                                    sessionResult={sessionResults.get(evalCase.id)}
                                    isRunning={runningId === evalCase.id}
                                    onRun={() => runSingle(evalCase)}
                                />
                            );
                        })
                    )}
                </div>
            )}

            {/* Pass-rate history chart */}
            <div>
                <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">History</h2>
                    <span className="text-xs text-muted">28 days · annotated with prompt versions</span>
                </div>
                <HistoryChart data={historyData} />
            </div>
        </div>
    );
}
