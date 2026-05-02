import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
    const supabase = await createClient();
    const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });

    return (
        <main className="p-8">
            <h1 className="font-serif text-2xl font-semibold text-ink">Trace</h1>
            <p className="text-sm text-muted mt-2">
                Documents in corpus: {count ?? 0}
                {error && <span className="text-error"> (Error: {error.message})</span>}
            </p>
            <div className="mt-6 flex gap-3">
                <Link href="/ask" className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition">
                    Ask a question
                </Link>
                <Link href="/upload" className="px-4 py-2 rounded-lg border border-border text-ink text-sm font-medium hover:bg-surface transition">
                    Upload document
                </Link>
                <Link href="/dashboard" className="px-4 py-2 rounded-lg border border-border text-ink text-sm font-medium hover:bg-surface transition">
                    Dashboard
                </Link>
                <Link href="/evals" className="px-4 py-2 rounded-lg border border-border text-ink text-sm font-medium hover:bg-surface transition">
                    Evaluations
                </Link>
            </div>
        </main>
    );
}
