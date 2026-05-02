import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { hybridSearch } from '@/lib/retrieval/semantic';
import { rerank } from '@/lib/retrieval/rerank';
import { AnswerSchema } from '@/lib/generation/schema';
import { calculateCost } from '@/lib/ai/pricing';
import type { EvalCase, EvalRunRow, ExpectedProperties } from './types';

interface CheckOutcome {
    passed: boolean;
    reason: string;
}

function checkMustMention(answer: string, terms: string[] = []): CheckOutcome {
    if (terms.length === 0) return { passed: true, reason: '' };
    const lower = answer.toLowerCase();
    const missing = terms.filter((t) => !lower.includes(t.toLowerCase()));
    return {
        passed: missing.length === 0,
        reason: missing.length > 0 ? `Missing required terms: ${missing.join(', ')}` : '',
    };
}

function checkMustCite(citations: number[], required = true): CheckOutcome {
    if (!required) return { passed: true, reason: '' };
    return {
        passed: citations.length > 0,
        reason: citations.length === 0 ? 'No citations provided' : '',
    };
}

function checkMinConfidence(confidence: number, min = 0.5): CheckOutcome {
    return {
        passed: confidence >= min,
        reason: confidence < min ? `Confidence ${(confidence * 100).toFixed(0)}% below minimum ${(min * 100).toFixed(0)}%` : '',
    };
}

function checkMaxLength(answer: string, max = 1000): CheckOutcome {
    return {
        passed: answer.length <= max,
        reason: answer.length > max ? `Answer length ${answer.length} exceeds maximum ${max}` : '',
    };
}

function runChecks(
    answer: string,
    citations: number[],
    confidence: number,
    props: ExpectedProperties,
): { failures: string[]; score: number } {
    const outcomes = [
        checkMustMention(answer, props.must_mention),
        checkMustCite(citations, props.must_cite),
        checkMinConfidence(confidence, props.min_confidence),
        checkMaxLength(answer, props.max_length),
    ];
    const failures = outcomes.filter((o) => !o.passed).map((o) => o.reason);
    const score = (outcomes.filter((o) => o.passed).length / outcomes.length);
    return { failures, score };
}

export async function runEvaluation(evalCase: EvalCase): Promise<EvalRunRow> {
    const supabase = await createClient();
    const startTime = Date.now();

    const { data: queryRow } = await supabase
        .from('queries')
        .insert({ question: evalCase.question, status: 'pending', ip_hash: null })
        .select('id')
        .single();

    const queryId: string | undefined = queryRow?.id;

    const fail = async (reasons: string[]): Promise<EvalRunRow> => {
        if (queryId) {
            await supabase
                .from('queries')
                .update({ status: 'error', error_message: reasons.join('; '), total_latency_ms: Date.now() - startTime })
                .eq('id', queryId);
        }
        const { data: run } = await supabase
            .from('evaluation_runs')
            .insert({ evaluation_id: evalCase.id, passed: false, score: 0, failure_reasons: reasons, query_id: queryId ?? null })
            .select()
            .single();
        return { ...(run as EvalRunRow), failure_reasons: reasons };
    };

    try {
        const candidates = await hybridSearch(evalCase.question, 20, { queryId });

        if (candidates.length === 0) {
            return fail(['No documents found in corpus']);
        }

        const topChunks = await rerank(evalCase.question, candidates, 5, { queryId });

        const { data: promptData } = await supabase
            .from('prompt_versions')
            .select('id, content, version')
            .eq('template_id', 'answer_generation')
            .eq('is_active', true)
            .single();

        if (!promptData) {
            return fail(['No active prompt version found']);
        }

        const sources = topChunks.map((chunk, i) => ({
            number: i + 1,
            content: chunk.content,
            documentTitle: chunk.document_title,
        }));

        const fullPrompt = promptData.content
            .replace('{sources}', sources.map((s) => `[${s.number}] (from "${s.documentTitle}")\n${s.content}`).join('\n\n'))
            .replace('{question}', evalCase.question);

        const { object, usage } = await generateObject({
            model: openai('gpt-4o'),
            schema: AnswerSchema,
            prompt: fullPrompt,
            temperature: 0,
        });

        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
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
            latency_ms: Date.now() - startTime,
            status: 'success',
        });

        if (queryId) {
            await supabase
                .from('queries')
                .update({
                    answer: object.answer,
                    citations: sources.filter((s) => object.citations?.includes(s.number)),
                    total_cost_usd: cost,
                    total_latency_ms: Date.now() - startTime,
                    total_input_tokens: inputTokens,
                    total_output_tokens: outputTokens,
                    status: 'success',
                })
                .eq('id', queryId);
        }

        const { failures, score } = runChecks(
            object.answer,
            object.citations ?? [],
            object.confidence,
            evalCase.expected_properties,
        );

        const { data: run } = await supabase
            .from('evaluation_runs')
            .insert({
                evaluation_id: evalCase.id,
                prompt_version_id: promptData.id,
                query_id: queryId ?? null,
                passed: failures.length === 0,
                score: Math.round(score * 100) / 100,
                failure_reasons: failures,
            })
            .select()
            .single();

        return { ...(run as EvalRunRow), failure_reasons: failures, prompt_version: promptData.version };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return fail([`Pipeline error: ${message}`]);
    }
}
