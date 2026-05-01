'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Document {
    id: string;
    title: string;
    created_at: string;
    chunk_count?: number;
}

interface CorpusStats {
    docCount: number;
    chunkCount: number;
}

export function Sidebar() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [stats, setStats] = useState<CorpusStats>({ docCount: 0, chunkCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        async function load() {
            const [{ data: docs }, { count: chunks }] = await Promise.all([
                supabase
                    .from('documents')
                    .select('id, title, created_at')
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabase
                    .from('chunks')
                    .select('*', { count: 'exact', head: true }),
            ]);

            const docList = docs ?? [];
            setDocuments(docList);
            setStats({ docCount: docList.length, chunkCount: chunks ?? 0 });
            setLoading(false);
        }

        load();
    }, []);

    return (
        <aside className="flex flex-col h-full w-72 shrink-0 bg-navy text-white overflow-hidden">
            {/* Header */}
            <div className="px-5 py-5 border-b border-border-navy">
                <span className="font-serif text-lg font-semibold tracking-tight text-white">
                    trace
                </span>
                <p className="text-xs text-navy-muted mt-0.5 font-mono">
                    rag · observe · iterate
                </p>
            </div>

            {/* Stats */}
            <div className="px-5 py-4 border-b border-border-navy">
                <p className="text-xs uppercase tracking-widest text-navy-muted mb-3 font-mono">
                    Corpus
                </p>
                <div className="flex gap-6">
                    <div>
                        <p className="text-2xl font-semibold text-white font-mono tabular-nums">
                            {loading ? '—' : stats.docCount}
                        </p>
                        <p className="text-xs text-navy-muted mt-0.5">documents</p>
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-white font-mono tabular-nums">
                            {loading ? '—' : stats.chunkCount.toLocaleString()}
                        </p>
                        <p className="text-xs text-navy-muted mt-0.5">chunks</p>
                    </div>
                </div>
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto">
                <p className="px-5 pt-4 pb-2 text-xs uppercase tracking-widest text-navy-muted font-mono">
                    Documents
                </p>

                {loading ? (
                    <div className="px-5 space-y-2">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-8 rounded bg-navy-light animate-pulse"
                            />
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-navy-muted">
                        No documents yet.{' '}
                        <a href="/upload" className="text-accent underline underline-offset-2">
                            Upload one
                        </a>
                    </p>
                ) : (
                    <ul className="px-3 pb-4 space-y-0.5">
                        {documents.map((doc) => (
                            <li key={doc.id}>
                                <div className="px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-navy-light transition-colors cursor-default">
                                    <p className="truncate font-medium leading-snug">
                                        {doc.title}
                                    </p>
                                    <p className="text-xs text-navy-muted mt-0.5 font-mono">
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer: upload link */}
            <div className="px-5 py-4 border-t border-border-navy">
                <a
                    href="/upload"
                    className="flex items-center gap-2 text-sm text-navy-muted hover:text-white transition-colors"
                >
                    <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 3.75 3.75 0 0 1 3.53 4.09A4.5 4.5 0 0 1 17.25 19.5H6.75Z"
                        />
                    </svg>
                    Upload document
                </a>
            </div>
        </aside>
    );
}
