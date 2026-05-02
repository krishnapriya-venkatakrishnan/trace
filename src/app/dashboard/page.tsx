import { Suspense } from 'react';
import { getDashboardData, type TimeRange } from '@/lib/dashboard/queries';
import { TimeRangePicker } from './components/TimeRangePicker';
import { StatTile } from './components/StatTile';
import { CostSection } from './components/CostSection';
import { LatencySection } from './components/LatencySection';
import { QualitySection } from './components/QualitySection';
import { RecentQueriesTable } from './components/RecentQueriesTable';
import { ActivityIcon, DollarSignIcon, ClockIcon, CheckCircleIcon } from 'lucide-react';

const validRanges = new Set<TimeRange>(['1h', '24h', '7d', '30d']);

function toRange(v: unknown): TimeRange {
    return validRanges.has(v as TimeRange) ? (v as TimeRange) : '7d';
}

function fmtCost(usd: number) {
    if (usd >= 1) return `$${usd.toFixed(2)}`;
    return `${(usd * 100).toFixed(3)}¢`;
}

function fmtMs(ms: number) {
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { range: rawRange } = await searchParams;
    const range = toRange(rawRange);

    const data = await getDashboardData(range);
    const { todayStats, costByPhase, costByModel, latencyByDay, qualityOverTime, recentQueries } = data;

    return (
        <div className="px-8 py-6 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-ink">Observability</h1>
                    <p className="text-sm text-muted">Query pipeline metrics and costs</p>
                </div>
                <Suspense>
                    <TimeRangePicker current={range} />
                </Suspense>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile
                    label="Queries"
                    value={todayStats.queries.toLocaleString()}
                    icon={<ActivityIcon size={16} />}
                />
                <StatTile
                    label="Total cost"
                    value={fmtCost(todayStats.totalCost)}
                    icon={<DollarSignIcon size={16} />}
                />
                <StatTile
                    label="p95 latency"
                    value={fmtMs(todayStats.p95Latency)}
                    icon={<ClockIcon size={16} />}
                />
                <StatTile
                    label="Success rate"
                    value={`${todayStats.qualityScore.toFixed(1)}%`}
                    icon={<CheckCircleIcon size={16} />}
                    trend={
                        todayStats.qualityScore >= 95 ? 'up' :
                        todayStats.qualityScore >= 80 ? 'neutral' : 'down'
                    }
                />
            </div>

            {/* Section A: Cost */}
            <CostSection costByPhase={costByPhase} costByModel={costByModel} />

            {/* Section B: Latency */}
            <LatencySection latencyByDay={latencyByDay} />

            {/* Section C: Quality */}
            <QualitySection qualityOverTime={qualityOverTime} />

            {/* Section D: Recent queries */}
            <RecentQueriesTable queries={recentQueries} />
        </div>
    );
}
