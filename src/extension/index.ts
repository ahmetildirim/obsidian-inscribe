import { ViewPlugin, EditorView, ViewUpdate, Decoration, WidgetType, keymap } from '@codemirror/view';
import { StateEffect, Text, Prec, StateField, EditorState, EditorSelection } from '@codemirror/state';

// ======================
// Type Definitions
// ======================

/** Represents a suggestion with text content and splitting strategy */
export interface Suggestion {
    text: string;
    splitStrategy: SplitStrategy;
}

export type SplitStrategy = keyof typeof SplitStrategies;

/** Empty suggestion constant for initialization/reset purposes */
export const EmptySuggestion: Suggestion = {
    text: '',
    splitStrategy: 'word',
};

/** Configuration options for the inline suggestion extension */
export interface InlineSuggestionOptions {
    /** Async function to fetch suggestions based on editor state */
    fetchFn: (state: EditorState) => AsyncGenerator<Suggestion> | Promise<Suggestion>;
    /** Debounce delay for suggestion requests (ms) */
    delayMs?: number;
    /** Keyboard shortcut to accept suggestions (default: Tab) */
    acceptShortcut?: string;
}

/** Represents the current state of suggestions in the editor */
interface SuggestionState {
    fullSuggestion: string | null;
    remainingSuggestion: string | null;
    originalDocument: Text | null;
    splitStrategy: keyof typeof SplitStrategies | null;
}

// ======================
// State Management
// ======================

/** Creates state management components for suggestion tracking */
const createStateManagement = () => {
    /** State effect for updating suggestions */
    const SuggestionEffect = StateEffect.define<{
        suggestion: string | null;
        splitStrategy: keyof typeof SplitStrategies | null;
        document: Text | null;
    }>();

    /** State field tracking current suggestion state */
    const SuggestionStateField = StateField.define<SuggestionState>({
        create: () => ({
            fullSuggestion: null,
            remainingSuggestion: null,
            originalDocument: null,
            splitStrategy: null
        }),
        update(oldState, transaction) {
            // Handle suggestion updates from effects
            const effect = transaction.effects.find(e => e.is(SuggestionEffect));
            if (effect) {
                return effect.value.suggestion === null
                    ? { // Clear all suggestion state
                        fullSuggestion: null,
                        remainingSuggestion: null,
                        originalDocument: null,
                        splitStrategy: null
                    }
                    : { // Update with new suggestion
                        fullSuggestion: effect.value.suggestion,
                        remainingSuggestion: effect.value.suggestion,
                        originalDocument: effect.value.document,
                        splitStrategy: effect.value.splitStrategy,
                    };
            }

            // Reset remaining suggestion on document changes
            return transaction.docChanged
                ? { ...oldState, remainingSuggestion: null }
                : oldState;
        }
    });

    return { SuggestionEffect, SuggestionStateField };
};

// ======================
// Rendering Components
// ======================

/** Creates components responsible for displaying suggestions */
const createRenderingComponents = () => {
    /** Widget that displays inline suggestions */
    class SuggestionWidget extends WidgetType {
        constructor(readonly suggestion: string) { super(); }

        toDOM() {
            const element = document.createElement('span');
            element.className = 'cm-inline-suggestion';
            element.style.opacity = '0.4';
            element.textContent = this.suggestion;
            return element;
        }
    }

    /** Creates decoration set for current suggestion position */
    function createSuggestionDecoration(view: EditorView, suggestionText: string) {
        const cursorPos = view.state.selection.main.head;
        return Decoration.set([
            Decoration.widget({
                widget: new SuggestionWidget(suggestionText),
                side: 1, // Display after cursor position
            }).range(cursorPos),
        ]);
    }

    /** View plugin that updates suggestion decorations */
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

// ======================
// Suggestion Fetch System
// ======================

/** Creates components for debounced suggestion fetching */
const createFetchSystem = (
    fetchFn: (state: EditorState) => AsyncGenerator<Suggestion>,
    delay: number
) => {
    let currentRequestId = 0;

    /** Debounce wrapper for suggestion generator */
    const { debouncedGenerator, cancelDebounce } = (() => {
        let timeoutId: NodeJS.Timeout;
        let cancel: () => void = () => { };

        const debounceGenerator = <T>(generator: (...args: any[]) => AsyncGenerator<T>) =>
            async function* (...args: any[]) {
                clearTimeout(timeoutId);
                let active = true;

                await new Promise(resolve => {
                    timeoutId = setTimeout(resolve, delay);
                    cancel = () => {
                        active = false;
                        resolve(null);
                    };
                });

                if (!active) return;
                yield* generator(...args);
            };

        return {
            debouncedGenerator: debounceGenerator(fetchFn),
            cancelDebounce: () => cancel()
        };
    })();

    /** View plugin that triggers suggestion fetches */
    const fetchPlugin = ViewPlugin.fromClass(
        class {
            async update(update: ViewUpdate) {
                const state = update.state;
                const hasActiveSuggestion = state.field(SuggestionStateField).remainingSuggestion;

                // Don't fetch if there are existing suggestions or no document changes
                if (!update.docChanged || hasActiveSuggestion) return;

                const requestId = ++currentRequestId;
                for await (const suggestion of debouncedGenerator(state)) {
                    // Cancel if new request was made while processing
                    if (requestId !== currentRequestId) return;

                    update.view.dispatch({
                        effects: SuggestionEffect.of({
                            suggestion: suggestion.text,
                            splitStrategy: suggestion.splitStrategy,
                            document: state.doc,
                        }),
                    });
                }
            }
        }
    );

    return { fetchPlugin, cancelDebounce };
};

// ======================
// Input Handling
// ======================

/** Creates keyboard handlers for suggestion acceptance */
const createInputHandlers = (
    cancelFetch: () => void,
    acceptKey: string
) => {
    /** Insert text at cursor position and update selection */
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

    /** Keymap for accepting suggestions in chunks */
    const suggestionKeymap = Prec.highest(
        keymap.of([{
            key: acceptKey,
            run: (view: EditorView) => {
                const state = view.state.field(SuggestionStateField);
                if (!state.remainingSuggestion) return false;

                // Get appropriate splitting strategy
                const strategyName = state.splitStrategy || 'word';
                const splitter = SplitStrategies[strategyName];
                const { accept, remaining } = splitter(state.remainingSuggestion);

                if (!accept) return false;

                // Update editor state with accepted portion
                view.dispatch({
                    ...insertSuggestionText(view.state, accept),
                    effects: SuggestionEffect.of({
                        suggestion: remaining || null,
                        document: remaining ? state.originalDocument : null,
                        splitStrategy: remaining ? state.splitStrategy : null,
                    }),
                });

                // Cancel fetch if suggestion is fully accepted
                if (!remaining) cancelFetch();
                return true;
            },
        }])
    );

    return { suggestionKeymap };
};

// ======================
// Split Strategies
// ======================

/** Text splitting strategies for partial suggestion acceptance */
const SplitStrategies = {
    /** Split at word boundaries (whitespace) */
    word: (remaining: string) => {
        const firstSpace = remaining.indexOf(' ');
        return firstSpace === -1
            ? { accept: remaining, remaining: '' }
            : {
                accept: remaining.slice(0, firstSpace + 1),
                remaining: remaining.slice(firstSpace + 1)
            };
    },

    /** Split at sentence boundaries (.!? followed by whitespace) */
    sentence: (remaining: string) => {
        const sentenceEnd = remaining.match(/[.!?]\s+/);
        return sentenceEnd
            ? {
                accept: remaining.slice(0, sentenceEnd.index! + 1),
                remaining: remaining.slice(sentenceEnd.index! + 1),
            }
            : { accept: remaining, remaining: '' };
    },

    /** Split at paragraph boundaries (double newline) */
    paragraph: (remaining: string) => {
        const paragraphEnd = remaining.indexOf('\n\n');
        return paragraphEnd === -1
            ? { accept: remaining, remaining: '' }
            : {
                accept: remaining.slice(0, paragraphEnd + 2),
                remaining: remaining.slice(paragraphEnd + 2),
            };
    },

    /** Accept entire suggestion at once */
    full: (remaining: string) => ({
        accept: remaining,
        remaining: '',
    }),
} as const;

// ======================
// Main Extension
// ======================

const { SuggestionEffect, SuggestionStateField } = createStateManagement();
const { suggestionRenderer } = createRenderingComponents();

/** Main extension function for inline suggestions */
export function inlineSuggestion(options: InlineSuggestionOptions) {
    const {
        delayMs = 500,
        acceptShortcut = 'Tab',
        fetchFn: userFetchFn,
    } = options;

    /** Normalize fetch function to always return AsyncGenerator */
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
        suggestionKeymap,
    ];
}