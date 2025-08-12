import { EditorState } from '@codemirror/state';

// Supported segmentation strategies
export type SplitStrategy = 'word' | 'sentence' | 'paragraph' | 'full';

// Inline suggestion structure – only carries text.
export interface Suggestion {
    text: string;
}

// Inline completion configuration.
export interface InlineCompletionConfig {
    fetchFunc: (
        state: EditorState
    ) => AsyncGenerator<Suggestion> | Promise<Suggestion>;
    // (Optional) A static hotkey for accepting suggestions.
    acceptanceHotkey?: string;
    // (Optional) A static hotkey for manually triggering suggestions.
    triggerHotkey?: string;
    // A function that returns current options.
    getOptions: () => InlineCompletionOptions;
}

export interface InlineCompletionOptions {
    delayMs?: number;
    splitStrategy?: SplitStrategy;
}
