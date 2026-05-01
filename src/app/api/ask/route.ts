import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { hybridSearch } from '@/lib/retrieval/semantic';
import { rerank } from '@/lib/retrieval/rerank';
import { AnswerSchema } from '@/lib/generation/schema';
import { calculateCost } from '@/lib/ai/pricing';
import { checkRateLimit, getClientIp, hashIp } from '@/lib/rate-limit';

const maxQuestionLength = 1000;

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const question: unknown = body?.question;

    if (typeof question !== 'string' || !question.trim()) {
        return new Response('Question is required', { status: 400 });
    }
    if (question.length > maxQuestionLength) {
        return new Response(`Question must be ${maxQuestionLength} characters or fewer`, { status: 400 });
    }

    // Compute hash once; used for both rate limiting and query storage
    const ip = getClientIp(req);
    const ipHash = ip ? hashIp(ip) : null;

    if (ipHash) {
        const allowed = await checkRateLimit(ipHash);
        if (!allowed) {
            return new Response('Rate limit exceeded. Try again in 24 hours.', {
                status: 429,
                headers: { 'Retry-After': String(24 * 60 * 60) },
            });
        }
    }

    const supabase = await createClient();
    const startTime = Date.now();

    const { data: query, error: queryError } = await supabase
        .from('queries')
        .insert({ question, status: 'pending', ip_hash: ipHash })
        .select()
        .single();

    if (queryError) {
        return new Response('Failed to create query', { status: 500 });
    }

    const queryId: string = query.id;

    try {
        const candidates = await hybridSearch(question, 20, { queryId });

        if (candidates.length === 0) {
            await supabase
                .from('queries')
                .update({ status: 'error', error_message: 'No documents in corpus' })
                .eq('id', queryId);
            return new Response(
                JSON.stringify({ error: 'No documents in the corpus. Upload some documents first.' }),
                { status: 422, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const topChunks = await rerank(question, candidates, 5, { queryId });

        const { data: promptData, error: promptError } = await supabase
            .from('prompt_versions')
            .select('content, version')
            .eq('template_id', 'answer_generation')
            .eq('is_active', true)
            .single();

        if (promptError) {
            throw new Error(`Failed to load prompt: ${promptError.message}`);
        }

        const sources = topChunks.map((chunk, i) => ({
            number: i + 1,
            chunkId: chunk.id,
            documentTitle: chunk.document_title,
            content: chunk.content,
        }));

        const sourcesText = sources
            .map((s) => `[${s.number}] (from "${s.documentTitle}")\n${s.content}`)
            .join('\n\n');

        const fullPrompt = promptData.content
            .replace('{sources}', sourcesText)
            .replace('{question}', question);

        const result = streamObject({
            model: openai('gpt-4o'),
            schema: AnswerSchema,
            prompt: fullPrompt,
            temperature: 0,
            onFinish: async ({ object, usage }) => {
                const latencyMs = Date.now() - startTime;
                const inputTokens = usage?.inputTokens ?? 0;
                const outputTokens = usage?.outputTokens ?? 0;
                const cost = calculateCost('gpt-4o', inputTokens, outputTokens);

                await supabase.from('llm_calls').insert({
                    query_id: queryId,
                    phase: 'generation',
                    model: 'gpt-4o',
                    prompt_template_id: 'answer_generation',
                    prompt_version: promptData.version,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    cost_usd: cost,
                    latency_ms: latencyMs,
                    status: 'success',
                });

                const { data: calls } = await supabase
                    .from('llm_calls')
                    .select('cost_usd, input_tokens, output_tokens')
                    .eq('query_id', queryId);

                const totalCostUsd = (calls ?? []).reduce((s, c) => s + Number(c.cost_usd), 0);
                const totalInput = (calls ?? []).reduce((s, c) => s + c.input_tokens, 0);
                const totalOutput = (calls ?? []).reduce((s, c) => s + c.output_tokens, 0);

                if (object) {
                    await supabase
                        .from('queries')
                        .update({
                            answer: object.answer,
                            citations: sources.filter((s) => object.citations?.includes(s.number)),
                            total_cost_usd: totalCostUsd,
                            total_latency_ms: Date.now() - startTime,
                            total_input_tokens: totalInput,
                            total_output_tokens: totalOutput,
                            status: 'success',
                        })
                        .eq('id', queryId);
                }
            },
        });

        return result.toTextStreamResponse({
            headers: {
                'X-Query-Id': queryId,
                'X-Sources': JSON.stringify(
                    sources.map((s) => ({ ...s, content: s.content.slice(0, 500) }))
                ),
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[/api/ask] query ${queryId} failed:`, err);

        await supabase
            .from('queries')
            .update({
                status: 'error',
                error_message: message,
                total_latency_ms: Date.now() - startTime,
            })
            .eq('id', queryId);

        // Never expose internal error details to the client
        return new Response('An error occurred processing your request.', { status: 500 });
    }
}
