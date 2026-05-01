'use client';

import { useState } from 'react';
import { ingestDocument } from '@/lib/documents/ingest';

export default function UploadPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setStatus('Ingesting...');
        try {
            const result = await ingestDocument({
                title,
                content,
                sourceType: 'text',
            });
            setStatus(`Done. ${result.chunkCount} chunks created.`);
            setTitle('');
            setContent('');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setStatus(`Error: ${message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="max-w-2xl mx-auto px-8 py-10">
            <h1 className="font-serif text-2xl font-semibold text-ink mb-6">
                Upload a document
            </h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition disabled:opacity-50"
                />
                <textarea
                    placeholder="Paste your content here…"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={20}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink placeholder:text-muted text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition disabled:opacity-50 resize-y"
                />
                <button
                    type="submit"
                    disabled={loading || !title.trim() || !content.trim()}
                    className="px-6 py-2.5 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-40 transition"
                >
                    {loading ? 'Ingesting…' : 'Ingest'}
                </button>
            </form>
            {status && (
                <p className={`mt-4 text-sm font-mono ${status.startsWith('Error') ? 'text-error' : 'text-muted'}`}>
                    {status}
                </p>
            )}
        </main>
    );
}
