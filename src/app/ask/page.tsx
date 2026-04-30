'use client';

import { useState } from 'react';
import { ask } from '@/lib/ask';

export default function AskPage() {
    const [question, setQuestion] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            debugger;
            const res = await ask(question);
            setResult(res);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-6">Ask a question</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="text"
                placeholder="What would you like to know?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                className="w-full p-3 border rounded-lg"
            />
            <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded-lg disabled:opacity-50"
            >
                {loading ? 'Thinking...' : 'Ask'}
            </button>
        </form>

        {error && <p className="mt-4 text-red-600">{error}</p>}

        {result && (
            <div className="mt-8 space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="leading-relaxed">{result.answer}</p>
                    <p className="mt-3 text-xs text-gray-500">
                        {result.totalLatencyMs}ms · ${result.totalCostUsd.toFixed(4)} · 
                        confidence {(result.confidence * 100).toFixed(0)}%
                    </p>
                </div>

                <div>
                    <h2 className="text-sm font-semibold mb-2">Sources</h2>
                    <div className="space-y-2">
                        {result.sources
                            .filter((s: any) => result.citations.includes(s.number))
                            .map((s: any) => (
                                <div key={s.chunkId} className="p-3 border rounded text-sm">
                                    <p className="font-medium">[{s.number}] {s.documentTitle}</p>
                                    <p className="text-gray-600 mt-1">{s.content.slice(0, 300)}...</p>
                                </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
        </main>
    );
}