'use server';

import { createClient } from '@/lib/supabase/server';
import { hybridSearch } from '@/lib/retrieval/semantic';
import { rerank } from '@/lib/retrieval/rerank';
import { generateAnswer, type AnswerWithSources } from '@/lib/generation/answer';
import { createHash } from 'crypto';

export interface AskResult extends AnswerWithSources {
    queryId: string;
    totalLatencyMs: number;
    totalCostUsd: number;
}

function hashIp(ip: string): string {
    return createHash('sha256').update(ip + process.env.IP_SALT || 'trace').digest('hex');
}

export async function ask(
    question: string,
    options: { ipAddress?: string } = {}
): Promise<AskResult> {
    const supabase = await createClient();
    const startTime = Date.now();

  // Rate limiting check
    if (options.ipAddress) {
        const ipHash = hashIp(options.ipAddress);
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
        .from('queries')
        .select('*', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', cutoff);
        if (count && count >= 30) {
        throw new Error('Rate limit exceeded. Try again in 24 hours.');
        }
    }

    // Create the query record FIRST so all telemetry can reference it
    const { data: query, error: queryError } = await supabase
        .from('queries')
        .insert({
            question,
            status: 'pending',
            ip_hash: options.ipAddress ? hashIp(options.ipAddress) : null,
        })
        .select()
        .single();

    if (queryError) throw new Error(`Failed to create query: ${queryError.message}`);
    const queryId = query.id;

    try {
        // Phase 1: Hybrid search retrieves 20 candidates
        const candidates = await hybridSearch(question, 20, { queryId });

        if (candidates.length === 0) {
            throw new Error('No documents in the corpus. Upload some documents first.');
        }

        // Phase 2: Re-rank to top 5
        const topChunks = await rerank(question, candidates, 5, { queryId });

        // Phase 3: Generate the answer
        const answer = await generateAnswer(question, topChunks, { queryId });

        const totalLatencyMs = Date.now() - startTime;

        // Aggregate costs from llm_calls table for this query
        const { data: calls } = await supabase
            .from('llm_calls')
            .select('cost_usd, input_tokens, output_tokens')
            .eq('query_id', queryId);

        const totalCostUsd = (calls || []).reduce((sum, c) => sum + Number(c.cost_usd), 0);
        const totalInputTokens = (calls || []).reduce((sum, c) => sum + c.input_tokens, 0);
        const totalOutputTokens = (calls || []).reduce((sum, c) => sum + c.output_tokens, 0);

        // Update query with final results
        await supabase
            .from('queries')
            .update({
                answer: answer.answer,
                citations: answer.sources.filter((s) => answer.citations.includes(s.number)),
                total_cost_usd: totalCostUsd,
                total_latency_ms: totalLatencyMs,
                total_input_tokens: totalInputTokens,
                total_output_tokens: totalOutputTokens,
                status: 'success',
            })
            .eq('id', queryId);

        return {
            ...answer,
            queryId,
            totalLatencyMs,
            totalCostUsd,
        };
    } catch (e: any) {
        await supabase
            .from('queries')
            .update({
                status: 'error',
                error_message: e.message,
                total_latency_ms: Date.now() - startTime,
            })
            .eq('id', queryId);
        throw e;
    }
}