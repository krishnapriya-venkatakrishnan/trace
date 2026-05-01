import { createClient } from '@/lib/supabase/server';
import { calculateCost, type ModelName } from './pricing';

export type LLMPhase = 'embedding' | 'retrieval' | 'rerank' | 'generation' | 'validation';

export interface TelemetryContext {
    queryId?: string;
    phase: LLMPhase;
    model: ModelName;
    promptTemplateId?: string;
    promptVersion?: number;
}

export interface LLMResult<TOutput> {
    inputTokens: number;
    outputTokens: number;
    output: TOutput;
    timeToFirstTokenMs?: number;
}

export async function withTelemetry<TOutput>(
    context: TelemetryContext,
    fn: () => Promise<LLMResult<TOutput>>,
): Promise<LLMResult<TOutput>> {
    const startTime = Date.now();
    let status: 'success' | 'error' | 'timeout' = 'success';
    let errorMessage: string | undefined;
    let result: LLMResult<TOutput> | undefined;

    try {
        result = await fn();
        return result;
    } catch (e: unknown) {
        const isAbort = e instanceof Error && e.name === 'AbortError';
        status = isAbort ? 'timeout' : 'error';
        errorMessage = e instanceof Error ? e.message : String(e);
        throw e;
    } finally {
        // Wrap in try-catch so a logging failure never swallows the original error
        try {
            const latencyMs = Date.now() - startTime;
            const cost = result
                ? calculateCost(context.model, result.inputTokens, result.outputTokens)
                : 0;

            const supabase = await createClient();
            supabase
                .from('llm_calls')
                .insert({
                    query_id: context.queryId,
                    phase: context.phase,
                    model: context.model,
                    prompt_template_id: context.promptTemplateId,
                    prompt_version: context.promptVersion,
                    input_tokens: result?.inputTokens ?? 0,
                    output_tokens: result?.outputTokens ?? 0,
                    cost_usd: cost,
                    latency_ms: latencyMs,
                    time_to_first_token_ms: result?.timeToFirstTokenMs,
                    status,
                    error_message: errorMessage,
                })
                .then(({ error }) => {
                    if (error) console.error('Telemetry log failed:', error);
                });
        } catch (logErr) {
            console.error('Telemetry setup failed:', logErr);
        }
    }
}
