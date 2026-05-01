import { z } from 'zod';

export const AnswerSchema = z.object({
    answer: z.string().describe('The answer text with inline [N] citations'),
    citations: z.array(z.number()).describe('Array of source numbers cited in the answer'),
    confidence: z.number().min(0).max(1).describe('Confidence in the answer 0-1'),
});

export type Answer = z.infer<typeof AnswerSchema>;
