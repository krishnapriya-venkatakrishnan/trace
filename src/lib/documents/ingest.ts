'use server';

import { createClient } from '@/lib/supabase/server';
import { chunkText } from '@/lib/ai/chunking';
import { embedBatch } from '@/lib/ai/embeddings';

export async function ingestDocument(input: {
    title: string;
    content: string;
    sourceType: 'text' | 'markdown' | 'pdf';
}) {
    const supabase = await createClient();

    // 1. Chunk the document
    const chunks = chunkText(input.content);
    if (chunks.length === 0) {
        throw new Error('No content to ingest');
    }

    // 2. Insert document row
    const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
            title: input.title,
            source_type: input.sourceType,
            content: input.content,
            total_chunks: chunks.length,
            total_tokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
        })
        .select()
        .single();

    if (docError) throw new Error(`Failed to create document: ${docError.message}`);

    // 3. Embed all chunks (batched)
    const embeddings = await embedBatch(chunks.map((c) => c.content));

    // 4. Insert chunk rows with embeddings
    const { error: chunksError } = await supabase.from('chunks').insert(
        chunks.map((chunk, i) => ({
            document_id: doc.id,
            chunk_index: chunk.index,
            content: chunk.content,
            token_count: chunk.tokenCount,
            embedding: embeddings[i],
        }))
    );

    if (chunksError) throw new Error(`Failed to insert chunks: ${chunksError.message}`);

    return { documentId: doc.id, chunkCount: chunks.length };
}