import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { EvalsClient } from './components/EvalsClient';
import type { EvalCase, EvalRunRow, HistoryPoint } from '@/lib/evaluation/types';

export default async function EvalsPage() {
    const supabase = await createClient();

    const now = new Date();
    const since28d = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: evals }, { data: runs }, { data: histRuns }] = await Promise.all([
        supabase
            .from('evaluations')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true }),
        supabase
            .from('evaluation_runs')
            .select('*, prompt_versions(version), queries(total_latency_ms, total_cost_usd)')
            .order('created_at', { ascending: false })
            .limit(200),
        supabase
            .from('evaluation_runs')
            .select('passed, created_at, prompt_versions(version)')
            .gte('created_at', since28d)
            .order('created_at', { ascending: true }),
    ]);

    const mappedRuns: EvalRunRow[] = (runs ?? []).map((r) => ({
        ...r,
        failure_reasons: (r.failure_reasons as string[]) ?? [],
        prompt_version: (r.prompt_versions as { version?: number } | null)?.version ?? null,
        latency_ms: (r.queries as { total_latency_ms?: number } | null)?.total_latency_ms ?? null,
        cost_usd: (r.queries as { total_cost_usd?: number } | null)?.total_cost_usd ?? null,
    }));

    // Build pass-rate history, grouping by day, detecting version transitions
    const dateMap = new Map<string, { passed: number; total: number; versions: Set<number> }>();
    for (const r of histRuns ?? []) {
        const key = format(new Date(r.created_at), 'MMM d');
        if (!dateMap.has(key)) dateMap.set(key, { passed: 0, total: 0, versions: new Set() });
        const entry = dateMap.get(key)!;
        entry.total++;
        if (r.passed) entry.passed++;
        const v = (r.prompt_versions as { version?: number } | null)?.version;
        if (v != null) entry.versions.add(v);
    }

    let prevMaxVersion: number | null = null;
    const historyData: HistoryPoint[] = Array.from(dateMap.entries()).map(([date, { passed, total, versions }]) => {
        const maxVersion = versions.size > 0 ? Math.max(...versions) : null;
        const isTransition = maxVersion != null && prevMaxVersion != null && maxVersion !== prevMaxVersion;
        const label = isTransition ? `v${prevMaxVersion}→v${maxVersion}` : undefined;
        if (maxVersion != null) prevMaxVersion = maxVersion;
        return { date, passRate: total > 0 ? (passed / total) * 100 : 0, passed, total, versionLabel: label };
    });

    return (
        <EvalsClient
            initialEvals={(evals ?? []) as EvalCase[]}
            initialRuns={mappedRuns}
            historyData={historyData}
        />
    );
}
