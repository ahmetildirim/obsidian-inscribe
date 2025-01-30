/**
 * A CodeMirror extension providing intelligent inline code suggestions with configurable
 * behavior for suggestion fetching, display, and acceptance.
 */

import { ViewPlugin, EditorView, ViewUpdate, Decoration, WidgetType, keymap } from '@codemirror/view';
import { StateEffect, Text, Prec, StateField, EditorState, EditorSelection, Transaction } from '@codemirror/state';

/**
 * Built-in strategies for splitting suggestions into accepted/remaining portions
 */
const SplitStrategies = {
    /** Split at word boundaries (space-separated) */
    word: (remaining: string) => {
        const firstSpace = remaining.indexOf(' ');
        return firstSpace === -1
            ? { accept: remaining, remaining: '' }
            : { accept: remaining.slice(0, firstSpace + 1), remaining: remaining.slice(firstSpace + 1) };
    },

    /** Split at sentence boundaries (punctuation followed by whitespace) */
    sentence: (remaining: string) => {
        const sentenceEnd = remaining.match(/[.!?]\s+/);
        return sentenceEnd
            ? { accept: remaining.slice(0, sentenceEnd.index! + 1), remaining: remaining.slice(sentenceEnd.index! + 1) }
            : { accept: remaining, remaining: '' };
    },

    /** Split at paragraph boundaries (double newline) */
    paragraph: (remaining: string) => {
        const paragraphEnd = remaining.indexOf('\n\n');
        return paragraphEnd === -1
            ? { accept: remaining, remaining: '' }
            : { accept: remaining.slice(0, paragraphEnd + 2), remaining: remaining.slice(paragraphEnd + 2) };
    },

    /** Accept entire suggestion at once */
    full: (remaining: string) => ({ accept: remaining, remaining: '' }),
} as const;

/**
 * Available strategies for splitting accepted suggestions from remaining text
 */
export type SplitStrategy = keyof typeof SplitStrategies;

/**
 * Represents a suggestion to be displayed inline in the editor
 */
export interface Suggestion {
    /** The full suggestion text to display */
    text: string;
    /** Strategy for splitting the suggestion into accept/remain portions */
    splitStrategy: SplitStrategy;
}

/**
 * Configuration options for the inline suggestion extension
 */
export interface InlineSuggestionOptions {
    /** Async function to fetch suggestions based on current editor state */
    fetchFn: (state: EditorState) => AsyncGenerator<Suggestion> | Promise<Suggestion>;
    /** Debounce delay for suggestion fetches (ms) */
    delayMs?: number;
    /** Keyboard shortcut to accept current suggestion */
    acceptShortcut?: string;
}

/**
 * Internal state tracking for suggestion management
 */
interface SuggestionState {
    fullSuggestion: string | null;
    remainingSuggestion: string | null;
    originalDocument: Text | null;
    splitStrategy: SplitStrategy | null;
    originalCursorPos: number | null;
}

/**
 * Empty suggestion constant used for initialization and reset operations
 */
export const EmptySuggestion: Suggestion = {
    text: '',
    splitStrategy: 'word',
};

/* ----------------------------- State Management ----------------------------- */

/**
 * State effect for updating suggestion information
 */
const SuggestionEffect = StateEffect.define<{
    suggestion: string | null;
    splitStrategy: SplitStrategy | null;
    document: Text | null;
    originalCursorPos: number | null;
}>();

/**
 * State field for managing inline suggestion state
 */
const SuggestionStateField = StateField.define<SuggestionState>({
    create: () => ({
        fullSuggestion: null,
        remainingSuggestion: null,
        originalDocument: null,
        splitStrategy: null,
        originalCursorPos: null,
    }),

    update(oldState, transaction) {
        // Check if there's a suggestion effect in the transaction
        const suggestionEffect = transaction.effects.find(e => e.is(SuggestionEffect));
        if (suggestionEffect) {
            return handleSuggestionEffect(suggestionEffect.value);
        }

        // Handle document changes while a suggestion is active
        if (transaction.docChanged && oldState.remainingSuggestion && oldState.originalCursorPos !== null) {
            return handleDocumentChange(oldState, transaction);
        }

        // Handle cursor movement without document changes
        if (oldState.remainingSuggestion !== null && oldState.originalCursorPos !== null) {
            return handleCursorMovement(oldState, transaction);
        }

        // No relevant changes
        return oldState;
    }
});

function handleSuggestionEffect(effectValue: {
    suggestion: string | null;
    splitStrategy: SplitStrategy | null;
    document: Text | null;
    originalCursorPos: number | null;
}): SuggestionState {
    // CASE 1: Reset or CASE 2: Initialize new suggestion
    return effectValue.suggestion === null
        ? {
            fullSuggestion: null,
            remainingSuggestion: null,
            originalDocument: null,
            splitStrategy: null,
            originalCursorPos: null,
        }
        : {
            fullSuggestion: effectValue.suggestion,
            remainingSuggestion: effectValue.suggestion,
            originalDocument: effectValue.document,
            splitStrategy: effectValue.splitStrategy,
            originalCursorPos: effectValue.originalCursorPos,
        };
}

function handleDocumentChange(oldState: SuggestionState, transaction: Transaction): SuggestionState {
    let insertedText = '';
    let isInsertionAtCursor = false;

    transaction.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        if (fromA === oldState.originalCursorPos && toA === fromA) {
            insertedText = inserted.toString();
            isInsertionAtCursor = true;
        }
    });

    // CASE 5: Input elsewhere
    if (!isInsertionAtCursor) {
        return {
            ...oldState,
            remainingSuggestion: null,
            originalCursorPos: null,
        };
    }

    if (oldState.remainingSuggestion === null || oldState.originalCursorPos === null) {
        return {
            ...oldState,
            remainingSuggestion: null,
            originalCursorPos: null,
        };
    }

    // CASE 3: Valid partial acceptance or CASE 4: Invalid input
    return oldState.remainingSuggestion.startsWith(insertedText)
        ? {
            ...oldState,
            remainingSuggestion: oldState.remainingSuggestion.slice(insertedText.length) || null,
            originalCursorPos: oldState.originalCursorPos + insertedText.length,
        }
        : {
            ...oldState,
            remainingSuggestion: null,
            originalCursorPos: null,
        };
}

function handleCursorMovement(oldState: SuggestionState, transaction: Transaction): SuggestionState {
    const currentCursorPos = transaction.state.selection.main.head;
    // CASE 6: Cursor moved from original position
    return currentCursorPos !== oldState.originalCursorPos
        ? { ...oldState, remainingSuggestion: null, originalCursorPos: null }
        : oldState;
}


/**
 * Custom widget implementation for displaying inline suggestions
 */
class SuggestionWidget extends WidgetType {
    constructor(readonly suggestion: string) { super(); }

    toDOM() {
        const element = document.createElement('span');
        element.className = 'cm-inline-suggestion';
        element.style.opacity = '0.5';
        element.textContent = this.suggestion;
        return element;
    }
}

/**
 * Creates decoration set for current suggestion position
 */
function createSuggestionDecoration(view: EditorView, suggestionText: string) {
    const cursorPos = view.state.selection.main.head;
    return Decoration.set([
        Decoration.widget({
            widget: new SuggestionWidget(suggestionText),
            side: 1, // Display after cursor position
        }).range(cursorPos),
    ]);
}

/**
 * View plugin handling suggestion decoration updates
 */
const suggestionRenderer = ViewPlugin.fromClass(
    class {
        decorations = Decoration.none;

        update(update: ViewUpdate) {
            const remaining = update.state.field(SuggestionStateField).remainingSuggestion;
            this.decorations = remaining
                ? createSuggestionDecoration(update.view, remaining)
                : Decoration.none;
        }
    },
    { decorations: (v) => v.decorations }
);

/**
 * Creates suggestion fetching system with debouncing and cancellation
 */
function createFetchSystem(
    fetchFn: (state: EditorState) => AsyncGenerator<Suggestion>,
    delay: number
) {
    let currentRequestId = 0;
    let timeoutId: NodeJS.Timeout;
    let activeGenerator = true;

    /**
     * Debounced generator with cancellation support
     */
    async function* debouncedGenerator(state: EditorState) {
        clearTimeout(timeoutId);
        activeGenerator = true;

        await new Promise(resolve => {
            timeoutId = setTimeout(resolve, delay);
        });

        if (activeGenerator) {
            yield* fetchFn(state);
        }
    }

    /**
     * View plugin handling suggestion fetching logic
     */
    const fetchPlugin = ViewPlugin.fromClass(
        class {
            async update(update: ViewUpdate) {
                const state = update.state;
                if (!update.docChanged || state.field(SuggestionStateField).remainingSuggestion) return;

                const requestId = ++currentRequestId;
                for await (const suggestion of debouncedGenerator(state)) {
                    if (requestId !== currentRequestId) return;
                    update.view.dispatch({
                        effects: SuggestionEffect.of({
                            suggestion: suggestion.text,
                            splitStrategy: suggestion.splitStrategy,
                            document: state.doc,
                            originalCursorPos: state.selection.main.head,
                        }),
                    });
                }
            }
        }
    );

    return {
        fetchPlugin,
        cancelDebounce: () => {
            activeGenerator = false;
            clearTimeout(timeoutId);
        }
    };
}

/**
 * Generates transaction for inserting suggestion text
 */
function insertSuggestionText(state: EditorState, text: string) {
    const cursorPos = state.selection.main.head;
    return {
        ...state.changeByRange(range => ({
            changes: { from: cursorPos, insert: text },
            range: EditorSelection.cursor(cursorPos + text.length)
        })),
        userEvent: 'input.complete',
    };
}

/**
 * Creates input handlers for suggestion acceptance
 */
function createInputHandlers(cancelFetch: () => void, acceptKey: string) {
    return Prec.highest(
        keymap.of([{
            key: acceptKey,
            run: (view: EditorView) => {
                const state = view.state.field(SuggestionStateField);
                if (!state.remainingSuggestion) return false;

                const strategyName = state.splitStrategy || 'word';
                const splitter = SplitStrategies[strategyName];
                const { accept, remaining } = splitter(state.remainingSuggestion);

                if (!accept) return false;

                view.dispatch({
                    ...insertSuggestionText(view.state, accept),
                    effects: SuggestionEffect.of({
                        suggestion: remaining || null,
                        document: remaining ? state.originalDocument : null,
                        splitStrategy: remaining ? state.splitStrategy : null,
                        originalCursorPos: null,
                    }),
                });

                if (!remaining) cancelFetch();
                return true;
            },
        }])
    );
}

/**
 * Main extension function for inline suggestions
 */
export function inlineSuggestion(options: InlineSuggestionOptions) {
    const { delayMs = 500, acceptShortcut = 'Tab', fetchFn: userFetchFn } = options;

    // Normalize fetch function to handle both async generators and promises
    const normalizedFetch = async function* (state: EditorState) {
        const result = await userFetchFn(state);
        if (Symbol.asyncIterator in result) {
            yield* result as AsyncGenerator<Suggestion>;
        } else {
            yield result as Suggestion;
        }
    };

    // Initialize system components
    const { fetchPlugin, cancelDebounce } = createFetchSystem(normalizedFetch, delayMs);
    const suggestionKeymap = createInputHandlers(cancelDebounce, acceptShortcut);

    return [
        SuggestionStateField,
        fetchPlugin,
        suggestionRenderer,
        suggestionKeymap
    ];
}