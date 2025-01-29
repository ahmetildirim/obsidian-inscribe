import { ViewPlugin, EditorView, ViewUpdate, Decoration, WidgetType, keymap } from '@codemirror/view';
import { StateEffect, Text, Prec, StateField, EditorState, EditorSelection } from '@codemirror/state';

/**
 * Represents a suggestion with text content and splitting strategy
 */
export interface Suggestion {
    text: string;
    splitStrategy: SplitStrategy;
}

/**
 * Determines how suggestions are split during partial acceptance
 */
export type SplitStrategy = keyof typeof SplitStrategies;

/**
 * Available strategies for splitting suggestions into acceptable chunks
 */
const SplitStrategies = {
    /** Split at word boundaries (spaces) */
    word: (remaining: string) => {
        const firstSpace = remaining.indexOf(' ');
        return firstSpace === -1
            ? { accept: remaining, remaining: '' }
            : { accept: remaining.slice(0, firstSpace + 1), remaining: remaining.slice(firstSpace + 1) };
    },

    /** Split at sentence boundaries (punctuation followed by space) */
    sentence: (remaining: string) => {
        const sentenceEnd = remaining.match(/[.!?]\s+/);
        return sentenceEnd
            ? { accept: remaining.slice(0, sentenceEnd.index! + 1), remaining: remaining.slice(sentenceEnd.index! + 1) }
            : { accept: remaining, remaining: '' };
    },

    /** Split at paragraph boundaries (double newlines) */
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
 * Configuration options for the inline suggestion extension
 */
export interface InlineSuggestionOptions {
    /** Async function to fetch suggestions based on editor state */
    fetchFn: (state: EditorState) => AsyncGenerator<Suggestion> | Promise<Suggestion>;
    /** Debounce delay for suggestion fetches in milliseconds */
    delayMs?: number;
    /** Keyboard shortcut to accept suggestions */
    acceptShortcut?: string;
}

/**
 * Represents the current state of inline suggestions
 */
interface SuggestionState {
    fullSuggestion: string | null;
    remainingSuggestion: string | null;
    originalDocument: Text | null;
    splitStrategy: SplitStrategy | null;
    originalCursorPos: number | null;
}

// State management components
const SuggestionEffect = StateEffect.define<{
    suggestion: string | null;
    splitStrategy: SplitStrategy | null;
    document: Text | null;
    originalCursorPos: number | null;
}>();

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
                ? {
                    fullSuggestion: null,
                    remainingSuggestion: null,
                    originalDocument: null,
                    splitStrategy: null,
                    originalCursorPos: null,
                }
                : {
                    fullSuggestion: effect.value.suggestion,
                    remainingSuggestion: effect.value.suggestion,
                    originalDocument: effect.value.document,
                    splitStrategy: effect.value.splitStrategy,
                    originalCursorPos: effect.value.originalCursorPos,
                };
        }

        // Handle document changes and suggestion tracking
        if (transaction.docChanged && oldState.remainingSuggestion && oldState.originalCursorPos !== null) {
            let insertedText = '';
            let isInsertionAtCursor = false;

            // Detect insertions at the original cursor position
            transaction.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                if (fromA === oldState.originalCursorPos && toA === fromA) {
                    insertedText = inserted.toString();
                    isInsertionAtCursor = true;
                }
            });

            if (isInsertionAtCursor) {
                if (oldState.remainingSuggestion.startsWith(insertedText)) {
                    const newRemaining = oldState.remainingSuggestion.slice(insertedText.length);
                    return {
                        ...oldState,
                        remainingSuggestion: newRemaining || null,
                        originalCursorPos: oldState.originalCursorPos + insertedText.length,
                    };
                } else {
                    return { ...oldState, remainingSuggestion: null, originalCursorPos: null };
                }
            }
        }

        return oldState;
    }
});

/**
 * Widget for displaying inline suggestions
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
 * Creates decoration for displaying suggestions at the cursor position
 */
function createSuggestionDecoration(view: EditorView, suggestionText: string) {
    const cursorPos = view.state.selection.main.head;
    return Decoration.set([
        Decoration.widget({
            widget: new SuggestionWidget(suggestionText),
            side: 1,
        }).range(cursorPos),
    ]);
}

/**
 * View plugin that manages suggestion decorations
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
 * Creates debounced fetch system for suggestions
 */
function createFetchSystem(
    fetchFn: (state: EditorState) => AsyncGenerator<Suggestion>,
    delay: number
) {
    let currentRequestId = 0;
    let timeoutId: NodeJS.Timeout;
    let active = true;

    const debouncedGenerator = async function* (state: EditorState) {
        const requestId = ++currentRequestId;
        clearTimeout(timeoutId);

        await new Promise(resolve => {
            timeoutId = setTimeout(resolve, delay);
        });

        if (requestId !== currentRequestId || !active) return;

        for await (const suggestion of fetchFn(state)) {
            if (requestId !== currentRequestId) return;
            yield suggestion;
        }
    };

    const cancelDebounce = () => {
        active = false;
        clearTimeout(timeoutId);
    };

    const fetchPlugin = ViewPlugin.fromClass(
        class {
            async update(update: ViewUpdate) {
                const state = update.state;
                if (!update.docChanged || state.field(SuggestionStateField).remainingSuggestion) return;

                for await (const suggestion of debouncedGenerator(state)) {
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
}

/**
 * Creates keyboard handlers for suggestion acceptance
 */
function createInputHandlers(cancelFetch: () => void, acceptKey: string) {
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

    const suggestionKeymap = Prec.highest(
        keymap.of([{
            key: acceptKey,
            run: (view: EditorView) => {
                const state = view.state.field(SuggestionStateField);
                if (!state.remainingSuggestion) return false;

                const splitter = SplitStrategies[state.splitStrategy || 'word'];
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
}

/**
 * Main entry point for the inline suggestion extension
 */
export function inlineSuggestion(options: InlineSuggestionOptions) {
    const {
        delayMs = 500,
        acceptShortcut = 'Tab',
        fetchFn: userFetchFn
    } = options;

    // Normalize fetch function to handle both async generators and promises
    const normalizedFetch = async function* (state: EditorState) {
        const result = await userFetchFn(state);
        if (Symbol.asyncIterator in result) {
            yield* result as AsyncGenerator<Suggestion>;
        } else {
            yield result as Suggestion;
        }
    };

    const { fetchPlugin, cancelDebounce } = createFetchSystem(normalizedFetch, delayMs);
    const { suggestionKeymap } = createInputHandlers(cancelDebounce, acceptShortcut);

    return [
        SuggestionStateField,
        fetchPlugin,
        suggestionRenderer,
        suggestionKeymap
    ];
}