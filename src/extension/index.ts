/**
 * A CodeMirror extension providing intelligent inline code suggestions with configurable
 * behavior for suggestion fetching, display, and acceptance.
 */

import { ViewPlugin, EditorView, ViewUpdate, Decoration, WidgetType, keymap } from '@codemirror/view';
import { StateEffect, Text, Prec, StateField, EditorState, EditorSelection } from '@codemirror/state';

//#region Core Interfaces and Constants
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
 * Available strategies for splitting accepted suggestions from remaining text
 */
export type SplitStrategy = keyof typeof SplitStrategies;

/**
 * Empty suggestion constant used for initialization and reset operations
 */
export const EmptySuggestion: Suggestion = {
    text: '',
    splitStrategy: 'word',
};

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
//#endregion

//#region State Management
/**
 * Creates state management infrastructure for suggestion tracking
 */
const createStateManagement = () => {
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
     * State field maintaining current suggestion state
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
            // Handle suggestion effect updates
            const effect = transaction.effects.find(e => e.is(SuggestionEffect));
            if (effect) {
                return effect.value.suggestion === null
                    ? { // Reset state
                        fullSuggestion: null,
                        remainingSuggestion: null,
                        originalDocument: null,
                        splitStrategy: null,
                        originalCursorPos: null,
                    }
                    : { // Initialize new suggestion
                        fullSuggestion: effect.value.suggestion,
                        remainingSuggestion: effect.value.suggestion,
                        originalDocument: effect.value.document,
                        splitStrategy: effect.value.splitStrategy,
                        originalCursorPos: effect.value.originalCursorPos,
                    };
            }

            // Handle user input that affects current suggestion
            if (transaction.docChanged && oldState.remainingSuggestion && oldState.originalCursorPos !== null) {
                let insertedText = '';
                let isInsertionAtCursor = false;

                // Analyze document changes to detect user input
                transaction.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                    if (fromA === oldState.originalCursorPos && toA === fromA) {
                        insertedText = inserted.toString();
                        isInsertionAtCursor = true;
                    }
                });

                if (isInsertionAtCursor) {
                    // Validate if input matches current suggestion
                    if (oldState.remainingSuggestion.startsWith(insertedText)) {
                        const newRemaining = oldState.remainingSuggestion.slice(insertedText.length);
                        return {
                            ...oldState,
                            remainingSuggestion: newRemaining || null,
                            originalCursorPos: oldState.originalCursorPos + insertedText.length,
                        };
                    } else {
                        // Invalid input - discard suggestion
                        return { ...oldState, remainingSuggestion: null, originalCursorPos: null };
                    }
                } else {
                    // Input occurred elsewhere - discard suggestion
                    return { ...oldState, remainingSuggestion: null, originalCursorPos: null };
                }
            }

            return oldState;
        }
    });

    return { SuggestionEffect, SuggestionStateField };
};
//#endregion

//#region Rendering Components
/**
 * Creates visual components for suggestion display
 */
const createRenderingComponents = () => {
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

    return { suggestionRenderer };
};
//#endregion

//#region Suggestion Fetch System
/**
 * Creates suggestion fetching system with debouncing and cancellation
 */
const createFetchSystem = (
    fetchFn: (state: EditorState) => AsyncGenerator<Suggestion>,
    delay: number
) => {
    let currentRequestId = 0;

    // Debounce implementation with cancellation support
    const { debouncedGenerator, cancelDebounce } = (() => {
        let timeoutId: NodeJS.Timeout;
        let cancel = () => { };

        const debounceGenerator = <T>(generator: (...args: any[]) => AsyncGenerator<T>) =>
            async function* (...args: any[]) {
                clearTimeout(timeoutId);
                let active = true;
                await new Promise(resolve => {
                    timeoutId = setTimeout(resolve, delay);
                    cancel = () => { active = false; resolve(null); };
                });
                if (active) yield* generator(...args);
            };

        return {
            debouncedGenerator: debounceGenerator(fetchFn),
            cancelDebounce: () => cancel()
        };
    })();

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

    return { fetchPlugin, cancelDebounce };
};
//#endregion

//#region Input Handling
/**
 * Creates input handlers for suggestion acceptance
 */
const createInputHandlers = (cancelFetch: () => void, acceptKey: string) => {
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
     * Keymap handler for accepting suggestions
     */
    const suggestionKeymap = Prec.highest(
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

    return { suggestionKeymap };
};
//#endregion

//#region Split Strategies
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
//#endregion

// Initialize core state management and rendering components
const { SuggestionEffect, SuggestionStateField } = createStateManagement();
const { suggestionRenderer } = createRenderingComponents();

/**
 * Main extension function for inline suggestions
 */
export function inlineSuggestion(options: InlineSuggestionOptions) {
    const { delayMs = 500, acceptShortcut = 'Tab', fetchFn: userFetchFn } = options;

    // Normalize fetch function to handle both async generators and promises
    const normalizedFetch = async function* (state: EditorState) {
        const result = await userFetchFn(state);
        if (Symbol.asyncIterator in result) yield* result as AsyncGenerator<Suggestion>;
        else yield result as Suggestion;
    };

    // Initialize system components
    const { fetchPlugin, cancelDebounce } = createFetchSystem(normalizedFetch, delayMs);
    const { suggestionKeymap } = createInputHandlers(cancelDebounce, acceptShortcut);

    return [
        SuggestionStateField,
        fetchPlugin,
        suggestionRenderer,
        suggestionKeymap
    ];
}