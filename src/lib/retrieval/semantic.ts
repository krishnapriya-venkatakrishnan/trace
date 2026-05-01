import { createClient } from '@/lib/supabase/server';
import { embed } from '@/lib/ai/embeddings';

export interface RetrievedChunk {
    id: string;
    content: string;
    document_id: string;
    document_title: string;
    similarity: number;
}

// Shape returned by the hybrid_search RPC before we map it to RetrievedChunk
interface HybridSearchRow {
    id: string;
    content: string;
    document_id: string;
    document_title: string;
    combined_score: number;
}

export async function semanticSearch(
    query: string,
    limit: number = 20,
    context: { queryId?: string } = {}
): Promise<RetrievedChunk[]> {
    const supabase = await createClient();
    const queryEmbedding = await embed(query, context);

    const { data, error } = await supabase.rpc('match_chunks', {
        query_embedding: queryEmbedding,
        match_count: limit,
    });

    if (error) throw new Error(`Semantic search failed: ${error.message}`);
    return data as RetrievedChunk[];
}

export async function hybridSearch(
    query: string,
    limit: number = 20,
    context: { queryId?: string } = {}
): Promise<RetrievedChunk[]> {
    const supabase = await createClient();

    // Embedding is already timed + logged by withTelemetry inside embed()
    const queryEmbedding = await embed(query, context);

    // Time only the database call, not the embedding above
    const t0 = Date.now();

    const { data, error } = await supabase.rpc('hybrid_search', {
        query_text: query,
        query_embedding: queryEmbedding,
        match_count: limit,
    });

    if (error) throw new Error(`Hybrid search failed: ${error.message}`);

    const candidates = (data as HybridSearchRow[]).map((r) => ({
        id: r.id,
        content: r.content,
        document_id: r.document_id,
        document_title: r.document_title,
        similarity: r.combined_score,
    }));

    // Log retrieval phase — output_tokens used as a proxy for candidate count
    if (context.queryId) {
        supabase
            .from('llm_calls')
            .insert({
                query_id: context.queryId,
                phase: 'retrieval',
                model: 'text-embedding-3-small',
                input_tokens: 0,
                output_tokens: candidates.length,
                cost_usd: 0,
                latency_ms: Date.now() - t0,
                status: 'success',
            })
            .then(({ error: e }) => {
                if (e) console.error('Retrieval telemetry failed:', e);
            });
    }

    return candidates;
}
