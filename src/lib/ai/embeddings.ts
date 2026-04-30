import OpenAI from 'openai';
import { withTelemetry } from './telemetry';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embed(
    text: string,
    context: { queryId?: string }
): Promise<number[]> {
    const result = await withTelemetry(
        { phase: 'embedding', model: 'text-embedding-3-small', queryId: context.queryId },
        async () => {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
            });
            return {
                inputTokens: response.usage.total_tokens,
                outputTokens: 0,
                output: response.data[0].embedding,
            };
        }
    );
    return result.output as number[];
}

export async function embedBatch(
    texts: string[],
    context: { queryId?: string } = {}
): Promise<number[][]> {
    // OpenAI accepts arrays — much cheaper than one-by-one
    const result = await withTelemetry(
        { phase: 'embedding', model: 'text-embedding-3-small', queryId: context.queryId },
        async () => {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: texts,
            });
            return {
                inputTokens: response.usage.total_tokens,
                outputTokens: 0,
                output: response.data.map((d) => d.embedding),
            };
        }
    );
    return result.output as number[][];
}