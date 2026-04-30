// Prices per 1M tokens in USD. Update when providers change pricing.
// Source: openai.com/pricing, anthropic.com/pricing
export const modelPricing = {
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-3-large': { input: 0.13, output: 0 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
} as const;

export type ModelName = keyof typeof modelPricing;

export function calculateCost(
    model: ModelName,
    inputTokens: number,
    outputTokens: number
): number {
    const pricing = modelPricing[model];
    if (!pricing) return 0;
    return (
        (inputTokens / 1000000) * pricing.input +
        (outputTokens / 1000000) * pricing.output
    );
}