'use client';

import { useState } from 'react';
import { ingestDocument } from '@/lib/documents/ingest';

export default function UploadPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<string>('');

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
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
        } catch (err: any) {
            setStatus(`Error: ${err.message}`);
        }
    }

    return (
        <main className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-semibold mb-6">Upload a document</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full p-2 border rounded"
                />
                <textarea
                    placeholder="Paste your content here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={20}
                    className="w-full p-2 border rounded font-mono text-sm"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded"
                >
                    Ingest
                </button>
            </form>
            {status && <p className="mt-4 text-sm">{status}</p>}
        </main>
    );
}