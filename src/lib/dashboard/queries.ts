import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export type TimeRange = '1h' | '24h' | '7d' | '30d';

function getStartDate(range: TimeRange): Date {
    const now = new Date();
    switch (range) {
        case '1h':  return new Date(now.getTime() - 60 * 60 * 1000);
        case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '7d':  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
}

function pct(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function bucketKey(range: TimeRange, date: Date): string {
    if (range === '1h')  return format(date, 'HH:mm');
    if (range === '24h') return format(date, 'HH:00');
    return format(date, 'MMM d');
}

export interface TodayStats {
    queries: number;
    totalCost: number;
    p95Latency: number;
    qualityScore: number;
}

export interface CostByPhaseRow {
    date: string;
    embedding: number;
    retrieval: number;
    rerank: number;
    generation: number;
}

export interface CostByModelRow {
    model: string;
    cost: number;
}

export interface LatencyRow {
    date: string;
    p50: number;
    p95: number;
    p99: number;
}

export interface QualityRow {
    date: string;
    successRate: number;
}

export interface QueryRow {
    id: string;
    question: string;
    status: string;
    total_cost_usd: number | null;
    total_latency_ms: number | null;
    total_input_tokens: number | null;
    total_output_tokens: number | null;
    created_at: string;
}

export interface DashboardData {
    todayStats: TodayStats;
    costByPhase: CostByPhaseRow[];
    costByModel: CostByModelRow[];
    latencyByDay: LatencyRow[];
    qualityOverTime: QualityRow[];
    recentQueries: QueryRow[];
}

export async function getDashboardData(range: TimeRange = '7d'): Promise<DashboardData> {
    const supabase = await createClient();
    const since = getStartDate(range).toISOString();

    const [{ data: queries }, { data: calls }] = await Promise.all([
        supabase
            .from('queries')
            .select('id, question, status, total_cost_usd, total_latency_ms, total_input_tokens, total_output_tokens, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: false }),
        supabase
            .from('llm_calls')
            .select('query_id, phase, model, cost_usd, latency_ms, created_at')
            .gte('created_at', since),
    ]);

    const q = queries ?? [];
    const c = calls ?? [];

    const latencies = q
        .map((r) => r.total_latency_ms)
        .filter((v): v is number => typeof v === 'number')
        .sort((a, b) => a - b);

    const successCount = q.filter((r) => r.status === 'success').length;

    const todayStats: TodayStats = {
        queries: q.length,
        totalCost: q.reduce((s, r) => s + Number(r.total_cost_usd ?? 0), 0),
        p95Latency: pct(latencies, 95),
        qualityScore: q.length > 0 ? (successCount / q.length) * 100 : 0,
    };

    // cost by phase — group llm_calls by bucket and phase
    const phaseMap = new Map<string, CostByPhaseRow>();
    for (const call of c) {
        const key = bucketKey(range, new Date(call.created_at));
        if (!phaseMap.has(key)) phaseMap.set(key, { date: key, embedding: 0, retrieval: 0, rerank: 0, generation: 0 });
        const row = phaseMap.get(key)!;
        const phase = call.phase as keyof Omit<CostByPhaseRow, 'date'>;
        if (phase in row) (row[phase] as number) += Number(call.cost_usd ?? 0);
    }
    const costByPhase = Array.from(phaseMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // cost by model
    const modelMap = new Map<string, number>();
    for (const call of c) {
        modelMap.set(call.model, (modelMap.get(call.model) ?? 0) + Number(call.cost_usd ?? 0));
    }
    const costByModel: CostByModelRow[] = Array.from(modelMap.entries())
        .map(([model, cost]) => ({ model, cost }))
        .sort((a, b) => b.cost - a.cost);

    // latency by bucket
    const latencyMap = new Map<string, number[]>();
    for (const row of q) {
        if (row.total_latency_ms == null) continue;
        const key = bucketKey(range, new Date(row.created_at));
        if (!latencyMap.has(key)) latencyMap.set(key, []);
        latencyMap.get(key)!.push(row.total_latency_ms);
    }
    const latencyByDay: LatencyRow[] = Array.from(latencyMap.entries())
        .map(([date, vals]) => {
            const sorted = [...vals].sort((a, b) => a - b);
            return { date, p50: pct(sorted, 50), p95: pct(sorted, 95), p99: pct(sorted, 99) };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    // quality over time
    const qualityMap = new Map<string, { total: number; success: number }>();
    for (const row of q) {
        const key = bucketKey(range, new Date(row.created_at));
        if (!qualityMap.has(key)) qualityMap.set(key, { total: 0, success: 0 });
        const entry = qualityMap.get(key)!;
        entry.total++;
        if (row.status === 'success') entry.success++;
    }
    const qualityOverTime: QualityRow[] = Array.from(qualityMap.entries())
        .map(([date, { total, success }]) => ({ date, successRate: total > 0 ? (success / total) * 100 : 0 }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const recentQueries: QueryRow[] = q.slice(0, 50);

    return { todayStats, costByPhase, costByModel, latencyByDay, qualityOverTime, recentQueries };
}
