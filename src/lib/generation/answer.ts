import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { withTelemetry } from '@/lib/ai/telemetry';
import type { RetrievedChunk } from '@/lib/retrieval/semantic';

export const AnswerSchema = z.object({
    answer: z.string().describe('The answer text with inline [N] citations'),
    citations: z.array(z.number()).describe('Array of source numbers cited in the answer'),
    confidence: z.number().min(0).max(1).describe('Confidence in the answer 0-1'),
});

export type Answer = z.infer<typeof AnswerSchema>;

export interface AnswerWithSources extends Answer {
    sources: Array<{
        number: number;
        chunkId: string;
        documentTitle: string;
        content: string;
    }>;
}

async function getActivePrompt(templateId: string): Promise<{ content: string; version: number }> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('prompt_versions')
        .select('content, version')
        .eq('template_id', templateId)
        .eq('is_active', true)
        .single();
    if (error) throw new Error(`No active prompt for ${templateId}`);
    return data;
}

export async function generateAnswer(
    question: string,
    chunks: RetrievedChunk[],
    context: { queryId: string }
): Promise<AnswerWithSources> {
    const prompt = await getActivePrompt('answer_generation');

    // Format sources for the model
    const sources = chunks.map((chunk, i) => ({
        number: i + 1,
        chunkId: chunk.id,
        documentTitle: chunk.document_title,
        content: chunk.content,
    }));

    const sourcesText = sources
        .map((s) => `[${s.number}] (from "${s.documentTitle}")\n${s.content}`)
        .join('\n\n');

    const fullPrompt = prompt.content
        .replace('{sources}', sourcesText)
        .replace('{question}', question);

    const result = await withTelemetry(
        {
            phase: 'generation',
            model: 'gpt-4o',
            queryId: context.queryId,
            promptTemplateId: 'answer_generation',
            promptVersion: prompt.version,
        },
        async () => {
            const startTime = Date.now();
            const response = await generateObject({
                model: openai('gpt-4o'),
                schema: AnswerSchema,
                prompt: fullPrompt,
                temperature: 0,
            });
            const ttft = Date.now() - startTime; // Approximate for non-streaming
            return {
                inputTokens: response.usage.inputTokens ?? 0,
                outputTokens: response.usage.outputTokens ?? 0,
                output: response.object,
                timeToFirstTokenMs: ttft,
            };
        }
    );

    return {
        ...(result.output as Answer),
        sources,
    };
}