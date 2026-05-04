'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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
        <aside className="px-2 flex flex-col w-72 shrink-0 bg-paper overflow-hidden border-r border-paper-2">
            {/* upload link */}
            <div className="px-5 py-4 border-t border-border-navy">
                <Link
                    href="/upload"
                    className="border border-dashed p-8 cursor-pointer border-navy-2 flex items-center gap-2 text-sm text-navy-muted hover:text-navy transition-colors"
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
                </Link>
            </div>
            
            {/* Document list */}
            <div className="flex-1 overflow-y-auto">
                <p className="px-5 pt-4 pb-2 text-xs uppercase tracking-widest text-muted font-mono">
                    Documents
                </p>

                {loading ? (
                    <div className="px-5 space-y-2">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-8 rounded bg-paper-2 animate-pulse"
                            />
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted">
                        No documents yet.{' '}
                        <Link href="/upload" className="text-accent underline underline-offset-2">
                            Upload one
                        </Link>
                    </p>
                ) : (
                    <ul className="px-2 pb-4 space-y-0.5">
                        {documents.map((doc) => (
                            <li key={doc.id} className='border-b border-paper-2'>
                                <div className="px-3 py-2 rounded-lg text-[0.8rem] transition-colors cursor-default">
                                    <p className="truncate text-navy-muted">
                                        {doc.title}
                                    </p>
                                    <p className="text-muted mt-0.5 text-[0.7rem] font-mono flex justify-end">
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </aside>
    );
}
