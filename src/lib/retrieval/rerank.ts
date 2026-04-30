import OpenAI from 'openai';
import { z } from 'zod';
import { withTelemetry } from '@/lib/ai/telemetry';
import type { RetrievedChunk } from './semantic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const RerankSchema = z.object({
    rankings: z.array(z.object({
        chunkIndex: z.number(),
        relevanceScore: z.number().min(0).max(10),
    })),
});

export async function rerank(
    query: string,
    chunks: RetrievedChunk[],
    topK: number = 5,
    context: { queryId?: string } = {}
): Promise<RetrievedChunk[]> {
    if (chunks.length <= topK) return chunks;

    const prompt = `You are a relevance scoring system. Score each passage's relevance to the question on a scale of 0-10.

    Question: ${query}

    Passages:
    ${chunks.map((c, i) => `[${i}] ${c.content}`).join('\n\n')}

    Return rankings as JSON: {"rankings":[{"chunkIndex":0,"relevanceScore":8},...]}`;

    const result = await withTelemetry(
        {
            phase: 'rerank',
            model: 'gpt-4o-mini',
            queryId: context.queryId,
            promptTemplateId: 'rerank',
        },
        async () => {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0,
            });
            const content = response.choices[0].message.content || '{}';
            return {
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0,
                output: content,
            };
        }
    );

    const parsed = RerankSchema.safeParse(JSON.parse(result.output as string));
    if (!parsed.success) {
        console.warn('Rerank validation failed, returning original order:', parsed.error);
        return chunks.slice(0, topK);
    }

    // Sort chunks by score descending, take top K
    return parsed.data.rankings
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, topK)
        .map((r) => chunks[r.chunkIndex])
        .filter(Boolean);
}