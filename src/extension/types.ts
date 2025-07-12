// Type definitions for inline completions extension

import { EditorState } from '@codemirror/state';

// Supported segmentation strategies
export type SplitStrategy = 'word' | 'sentence' | 'paragraph' | 'full';

// Inline suggestion structure
export interface Suggestion {
    text: string;
}

// Inline completion configuration
export interface InlineCompletionConfig {
    fetchFunc: (
        state: EditorState
    ) => AsyncGenerator<Suggestion> | Promise<Suggestion>;
    // Optional hotkey for accepting suggestions
    acceptanceHotkey?: string;
    // Optional hotkey for manually triggering suggestions
    manualActivationKey?: string;
    // Function that returns current options
    getOptions: () => InlineCompletionOptions;
}

export interface InlineCompletionOptions {
    delayMs?: number;
    splitStrategy?: SplitStrategy;
}

// Internal state for the current suggestion session
export interface SuggestionSession {
    fullText: string | null;
    remainingText: string | null;
    baselineDocument: import('@codemirror/state').Text | null;
    anchorPosition: number | null;
}
