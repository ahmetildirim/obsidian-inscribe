import { SplitStrategy } from './types';

export type SegmentationResult = { accepted: string; remaining: string };

// A set of text splitting functions used to determine how much of the
// suggestion to accept when triggered.
export const TextSplitStrategies: Record<SplitStrategy, (text: string) => SegmentationResult> = {
    // Word-level segmentation (space-delimited).
    // Accepts text until (and including) the first space.
    word: (text: string) => {
        const nextSpace = text.indexOf(' ');
        return nextSpace === -1
            ? { accepted: text, remaining: '' }
            : {
                accepted: text.slice(0, nextSpace + 1),
                remaining: text.slice(nextSpace + 1),
            };
    },

    // Sentence-level segmentation (punctuation followed by whitespace).
    sentence: (text: string) => {
        const match = text.match(/[.!?]\s+/);
        if (match && match.index !== undefined) {
            return {
                accepted: text.slice(0, match.index + 1),
                remaining: text.slice(match.index + 1),
            };
        }
        return { accepted: text, remaining: '' };
    },

    // Paragraph-level segmentation (double newline).
    paragraph: (text: string) => {
        const paragraphEnd = text.indexOf('\n\n');
        return paragraphEnd === -1
            ? { accepted: text, remaining: '' }
            : {
                accepted: text.slice(0, paragraphEnd + 2),
                remaining: text.slice(paragraphEnd + 2),
            };
    },

    // Atomic acceptance – consume the entire suggestion.
    full: (text: string) => ({ accepted: text, remaining: '' }),
};
