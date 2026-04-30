// Semantic chunking: split on paragraph boundaries, target 200 tokens per chunk
// with 30-token overlap. Falls back to sentence boundaries for long paragraphs.

const targetChunkTokens = 200;
const chunkOverlapTokens = 30;
const tokensPerWord = 1.3; // Rough estimate for English

function estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).filter(Boolean).length * tokensPerWord);
}

export interface Chunk {
    content: string;
    index: number;
    tokenCount: number;
}

export function chunkText(text: string): Chunk[] {
    // Split by double-newline first (paragraphs)
    const paragraphs = text
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

    const chunks: Chunk[] = [];
    let currentText = '';
    let currentTokens = 0;
    let chunkIndex = 0;

    for (const para of paragraphs) {
        const paraTokens = estimateTokens(para);

        // If adding this paragraph would exceed target, finalize current chunk
        if (currentTokens + paraTokens > targetChunkTokens && currentText) {
            chunks.push({
                content: currentText,
                index: chunkIndex++,
                tokenCount: currentTokens,
            });

            // Start the next chunk with overlap from the previous one
            const overlapWords = currentText
                .split(/\s+/)
                .slice(-Math.ceil(chunkOverlapTokens / tokensPerWord));
            currentText = overlapWords.join(' ');
            currentTokens = estimateTokens(currentText);
        }

        // If a single paragraph is huge, split it by sentences
        if (paraTokens > targetChunkTokens * 1.5) {
            const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
            for (const sentence of sentences) {
                const sentTokens = estimateTokens(sentence);
                if (currentTokens + sentTokens > targetChunkTokens && currentText) {
                    chunks.push({
                        content: currentText,
                        index: chunkIndex++,
                        tokenCount: currentTokens,
                    });
                    currentText = sentence;
                    currentTokens = sentTokens;
                } else {
                    currentText += ' ' + sentence;
                    currentTokens += sentTokens;
                }
            }
        } else {
            currentText += (currentText ? '\n\n' : '') + para;
            currentTokens += paraTokens;
        }
    }

    // Final chunk
    if (currentText.trim()) {
        chunks.push({
            content: currentText.trim(),
            index: chunkIndex,
            tokenCount: currentTokens,
        });
    }

    return chunks;
}