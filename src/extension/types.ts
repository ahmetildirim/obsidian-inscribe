import { EditorState } from '@codemirror/state';

// Supported segmentation strategies
export type SplitStrategy = 'word' | 'sentence' | 'paragraph' | 'full';

// Inline suggestion structure – only carries text.
export interface Suggestion {
    text: string;
}

// Inline completion configuration.
export interface InlineCompletionConfig {
    // `manual` is true when the user explicitly asked for a suggestion.
    fetchFunc: (
        state: EditorState,
        manual: boolean
    ) => AsyncGenerator<Suggestion> | Promise<Suggestion>;
    // A function that returns current options.
    getOptions: () => InlineCompletionOptions;
}

export interface InlineCompletionOptions {
    delayMs?: number;
    splitStrategy?: SplitStrategy;
    // Fetch suggestions as the user types. Defaults to true.
    autoTrigger?: boolean;
}
