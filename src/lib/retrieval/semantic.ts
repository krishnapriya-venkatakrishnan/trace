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