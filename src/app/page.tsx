import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ThemeToggleButton } from "./components/ThemeToggleButton";

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
        { count: docCount },
        { count: queryCount },
        { data: latencyRows },
    ] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }),
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
            className="relative flex-1 flex flex-col"
            style={{ padding: '28px 48px', maxWidth: 1440, width: '100%', margin: '0 auto' }}
        >
            {/* Decorative side rule */}
            <span
                aria-hidden
                style={{
                    position: 'absolute',
                    top: 28,
                    bottom: 28,
                    left: 24,
                    width: 1,
                    background:
                        'linear-gradient(to bottom, transparent, var(--border) 12%, var(--border) 88%, transparent)',
                    pointerEvents: 'none',
                }}
            />

            {/* Colophon */}
            <span
                aria-hidden
                style={{
                    position: 'absolute',
                    bottom: 28,
                    right: 48,
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    fontFamily: 'var(--font-jetbrains)',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                }}
            >
                TRACE · 2026
            </span>

            {/* ── Header ── */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                    style={{
                        fontFamily: 'var(--font-fraunces)',
                        fontSize: 22,
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 10,
                    }}
                >
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            background: 'var(--navy)',
                            display: 'inline-block',
                            borderRadius: 1,
                            transform: 'translateY(-1px)',
                        }}
                    />
                    Trace
                </div>

                <nav style={{ display: 'flex', gap: 28, alignItems: 'center', fontSize: 13, color: 'var(--muted)' }}>
                    <Link href="/ask" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                        className="hover:text-ink! transition-colors duration-100">Ask</Link>
                    <Link href="/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                        className="hidden sm:block hover:text-ink! transition-colors duration-100">Dashboard</Link>
                    <Link href="/evals" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                        className="hidden sm:block hover:text-ink! transition-colors duration-100">Evals</Link>
                    <ThemeToggleButton />
                </nav>
            </header>

            {/* ── Main ── */}
            <main
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    maxWidth: 880,
                    marginTop: -40,
                }}
            >
                {/* Eyebrow */}
                <div
                    style={{
                        fontFamily: 'var(--font-jetbrains)',
                        fontSize: 11,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        marginBottom: 32,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <span
                        style={{
                            width: 5,
                            height: 5,
                            background: 'var(--navy)',
                            borderRadius: '50%',
                            flexShrink: 0,
                            boxShadow: '0 0 0 4px color-mix(in oklab, var(--navy) 18%, transparent)',
                        }}
                    />
                    An AI research assistant — with the receipts
                </div>

                {/* H1 */}
                <h1
                    style={{
                        fontFamily: 'var(--font-fraunces)',
                        fontWeight: 400,
                        fontSize: 'clamp(40px, 6.2vw, 84px)',
                        lineHeight: 1.02,
                        letterSpacing: '-0.025em',
                        margin: '0 0 28px',
                        maxWidth: '14ch',
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
                        fontFamily: 'var(--font-fraunces)',
                        fontWeight: 400,
                        fontSize: 21,
                        lineHeight: 1.5,
                        color: 'var(--muted)',
                        maxWidth: '52ch',
                        margin: '0 0 48px',
                    }}
                >
                    Trace is a retrieval assistant for your private corpus. Every answer is cited,
                    every call is logged, every cost is accounted for. The model is{' '}
                    <em style={{ fontStyle: 'italic', color: 'var(--ink)' }}>not</em> a black box.
                </p>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link
                        href="/ask"
                        style={{
                            fontFamily: 'var(--font-inter)',
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
                            fontFamily: 'var(--font-inter)',
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

                {/* Meta row */}
                <div
                    style={{
                        marginTop: 80,
                        paddingTop: 22,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--font-jetbrains)',
                        fontSize: 11,
                        color: 'var(--muted)',
                        letterSpacing: '0.02em',
                    }}
                >
                    <div style={{ display: 'flex', gap: 28 }}>
                        <span>v0.5.0 · {(queryCount ?? 0).toLocaleString()} queries served</span>
                        {p50 && p95 && (
                            <span>p50 {p50} · p95 {p95}</span>
                        )}
                    </div>
                    <div>
                        <span>{docCount ?? 0} documents indexed</span>
                    </div>
                </div>
            </main>

            {/* ── Footer ── */}
            <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 32, fontSize: 12, color: 'var(--muted)' }}>
                <div>
                    Built with{' '}
                    <em style={{ fontStyle: 'italic', fontFamily: 'var(--font-fraunces)', color: 'var(--ink)', fontSize: 13 }}>
                        care
                    </em>
                    . Fully observable.
                </div>
                <div>© 2026</div>
            </footer>
        </div>
    );
}
