import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function pct(sorted: number[], p: number): number | null {
    if (!sorted.length) return null;
    return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
}

function fmtMs(ms: number | null): string | null {
    return ms != null ? `${(ms / 1000).toFixed(2)}s` : null;
}

export default async function Home() {
    const supabase = await createClient();

    const [
        { count: queryCount },
        { data: latencyRows },
    ] = await Promise.all([
        supabase.from('queries').select('*', { count: 'exact', head: true }).eq('status', 'success'),
        supabase
            .from('queries')
            .select('total_latency_ms')
            .eq('status', 'success')
            .not('total_latency_ms', 'is', null)
            .order('created_at', { ascending: false })
            .limit(500),
    ]);

    const sortedMs = (latencyRows ?? [])
        .map((r) => r.total_latency_ms as number)
        .sort((a, b) => a - b);

    const p50 = fmtMs(pct(sortedMs, 0.5));
    const p95 = fmtMs(pct(sortedMs, 0.95));

    return (
        <div
            className="mt-20 flex flex-col p-8"
        >

            {/* ── Main ── */}
            <main>

                {/* H1 */}
                <h1
                    style={{
                        fontSize: 'clamp(40px, 6.2vw, 84px)',
                        lineHeight: 1.02,
                        letterSpacing: '-0.025em',
                        margin: '0 0 28px',
                        maxWidth: '1000px',
                        color: 'var(--ink)',
                    }}
                >
                    Ask questions across your own documents.{' '}
                    See{' '}
                    <em style={{ fontStyle: 'italic', color: 'var(--navy)', fontWeight: 400 }}>
                        exactly
                    </em>{' '}
                    how the AI thinks.
                </h1>

                {/* Lede */}
                <p
                    style={{
                        fontSize: 21,
                        lineHeight: 1.5,
                        color: 'var(--muted)',
                        maxWidth: '728px',
                        margin: '40px 8px 40px',
                    }}
                >
                    Trace is a retrieval assistant for your private corpus. Every answer is cited,
                    every call is logged, every cost is accounted for. The model is{' '}
                    <em style={{ fontStyle: 'italic', color: 'var(--ink)' }}>not</em> a black box.
                </p>
                
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--font-jetbrains)',
                        fontSize: 11,
                        color: 'var(--muted)',
                        letterSpacing: '0.02em',
                        marginBottom: 40,
                        marginLeft: 8,
                    }}
                >
                    <div style={{ display: 'flex', gap: 28 }}>
                        <span>{(queryCount ?? 0).toLocaleString()} queries served</span>
                        {p50 && p95 && (
                            <span>p50 {p50} · p95 {p95}</span>
                        )}
                    </div>
                </div>
                {/* CTAs */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginLeft: 8 }}>
                    <Link
                        href="/ask"
                        style={{
                            // fontFamily: 'var(--font-inter)',
                            fontSize: 14,
                            fontWeight: 500,
                            padding: '12px 22px',
                            borderRadius: 4,
                            border: '1px solid transparent',
                            background: 'var(--navy)',
                            color: '#F4F0E8',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            lineHeight: 1,
                            transition: 'opacity 120ms',
                        }}
                        className="hover:opacity-90"
                    >
                        Try it <span style={{ transition: 'transform 160ms' }} className="hover:translate-x-0.5">→</span>
                    </Link>
                    <Link
                        href="/dashboard"
                        style={{
                            // fontFamily: 'var(--font-inter)',
                            fontSize: 14,
                            fontWeight: 500,
                            padding: '12px 22px',
                            borderRadius: 4,
                            background: 'transparent',
                            color: 'var(--ink)',
                            border: '1px solid var(--border)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            lineHeight: 1,
                            transition: 'border-color 120ms',
                        }}
                        className="hover:border-ink!"
                    >
                        See the dashboard
                    </Link>
                </div>
                
            </main>
            
        </div>
    );
}
