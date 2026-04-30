import { createClient } from '@/lib/supabase/server';
import { embed } from '@/lib/ai/embeddings';

export interface RetrievedChunk {
    id: string;
    content: string;
    document_id: string;
    document_title: string;
    similarity: number;
}

export async function semanticSearch(
    query: string,
    limit: number = 20,
    context: { queryId?: string } = {}
): Promise<RetrievedChunk[]> {
    const supabase = await createClient();
    const queryEmbedding = await embed(query, context);

    // pgvector cosine distance: smaller is more similar
    // Convert to similarity score: 1 - distance
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
    const queryEmbedding = await embed(query, context);

    const { data, error } = await supabase.rpc('hybrid_search', {
        query_text: query,
        query_embedding: queryEmbedding,
        match_count: limit,
    });

    if (error) throw new Error(`Hybrid search failed: ${error.message}`);
    return (data as any[]).map((r) => ({
        id: r.id,
        content: r.content,
        document_id: r.document_id,
        document_title: r.document_title,
        similarity: r.combined_score,
    }));
}