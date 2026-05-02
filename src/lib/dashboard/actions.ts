'use server';

import { createClient } from '@/lib/supabase/server';

export interface LlmCallDetail {
    id: string;
    phase: string;
    model: string;
    input_tokens: number | null;
    output_tokens: number | null;
    cost_usd: number | null;
    latency_ms: number | null;
    time_to_first_token_ms: number | null;
    status: string;
    error_message: string | null;
    created_at: string;
}

export interface QueryDetail {
    id: string;
    question: string;
    answer: string | null;
    status: string;
    total_cost_usd: number | null;
    total_latency_ms: number | null;
    total_input_tokens: number | null;
    total_output_tokens: number | null;
    error_message: string | null;
    created_at: string;
    calls: LlmCallDetail[];
}

export async function getQueryDetail(queryId: string): Promise<QueryDetail | null> {
    const supabase = await createClient();

    const [{ data: query }, { data: calls }] = await Promise.all([
        supabase
            .from('queries')
            .select('id, question, answer, status, total_cost_usd, total_latency_ms, total_input_tokens, total_output_tokens, error_message, created_at')
            .eq('id', queryId)
            .single(),
        supabase
            .from('llm_calls')
            .select('id, phase, model, input_tokens, output_tokens, cost_usd, latency_ms, time_to_first_token_ms, status, error_message, created_at')
            .eq('query_id', queryId)
            .order('created_at', { ascending: true }),
    ]);

    if (!query) return null;

    return { ...query, calls: calls ?? [] };
}
