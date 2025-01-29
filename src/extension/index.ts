import { ViewPlugin, EditorView, ViewUpdate, Decoration, WidgetType, keymap } from '@codemirror/view';
import { StateEffect, Text, Prec, StateField, EditorState, EditorSelection } from '@codemirror/state';

//#region State Management
/**
 * State effect for updating inline suggestions. Carries:
 * - suggestion: Current suggestion text or null to clear
 * - doc: Snapshot of document when suggestion was generated
 */
const InlineSuggestionEffect = StateEffect.define<{
    suggestion: string | null;
    doc: Text | null;
}>();

/**
 * State field tracking current inline suggestion state:
 * - fullSuggestion: The full suggestion text
 * - remainingSuggestion: The remaining portion of the suggestion
 * - originalDoc: The document state when the suggestion was generated
 */
const InlineSuggestionState = StateField.define<{
    fullSuggestion: string | null;
    remainingSuggestion: string | null;
    originalDoc: Text | null;
}>({
    create: () => ({ fullSuggestion: null, remainingSuggestion: null, originalDoc: null }),
    update(oldState, transaction) {
        // Check for suggestion update effect
        const effect = transaction.effects.find(e => e.is(InlineSuggestionEffect));
        if (effect) {
            return effect.value.suggestion === null
                ? { fullSuggestion: null, remainingSuggestion: null, originalDoc: null }
                : {
                    fullSuggestion: effect.value.suggestion,
                    remainingSuggestion: effect.value.suggestion,
                    originalDoc: effect.value.doc,
                };
        }

        // Clear suggestions on document changes
        return transaction.docChanged ? { ...oldState, remainingSuggestion: null } : oldState;
    },
});
//#endregion

//#region Decoration & Widget
/**
 * Creates a decoration with inline suggestion widget at current cursor position
 */
function createSuggestionDecoration(view: EditorView, suggestionText: string) {
    const cursorPos = view.state.selection.main.head;
    return Decoration.set([
        Decoration.widget({
            widget: new InlineSuggestionWidget(suggestionText),
            side: 1, // Display after cursor
        }).range(cursorPos),
    ]);
}

/**
 * Widget that renders suggestion text with reduced opacity
 */
class InlineSuggestionWidget extends WidgetType {
    constructor(readonly suggestion: string) {
        super();
    }

    toDOM() {
        const element = document.createElement('span');
        element.className = 'cm-inline-suggestion';
        element.style.opacity = '0.4';
        element.textContent = this.suggestion;
        return element;
    }
}
//#endregion

//#region Suggestion Fetching
/**
 * Creates view plugin that manages suggestion fetching:
 * - Debounces input
 * - Cancels outdated requests
 * - Updates suggestions via state effects
 */
const createFetchPlugin = (fetchFn: InlineFetchFn) => {
    let currentRequestId = 0;

    return ViewPlugin.fromClass(
        class {
            async update(update: ViewUpdate) {
                const state = update.state;
                const hasExistingSuggestions = state.field(InlineSuggestionState).remainingSuggestion;

                // Skip if no changes or existing suggestions
                if (!update.docChanged || hasExistingSuggestions) return;

                const requestId = ++currentRequestId;
                for await (const suggestion of fetchFn(state)) {
                    // Cancel if newer request started
                    if (requestId !== currentRequestId) return;

                    update.view.dispatch({
                        effects: InlineSuggestionEffect.of({
                            suggestion,
                            doc: state.doc,
                        }),
                    });
                }
            }
        }
    );
};

/**
 * Wraps fetch function with debouncing and cancellation
 */
function debounceAsyncGenerator<T>(generatorFn: (...args: any[]) => AsyncGenerator<T>, delay: number) {
    let timeoutId: NodeJS.Timeout;
    let cancelDebounce: () => void;

    const debouncedGenerator = async function* (...args: any[]) {
        clearTimeout(timeoutId);
        let isActive = true;

        await new Promise((resolve) => {
            timeoutId = setTimeout(resolve, delay);
            cancelDebounce = () => {
                isActive = false;
                resolve(null);
            };
        });

        if (!isActive) return;
        yield* generatorFn(...args);
    };

    return { debouncedGenerator, cancelDebounce: () => cancelDebounce?.() };
}
//#endregion

//#region Rendering
/**
 * View plugin that manages suggestion decoration updates
 */
const renderPlugin = ViewPlugin.fromClass(
    class {
        decorations = Decoration.none;

        update(update: ViewUpdate) {
            const remaining = update.state.field(InlineSuggestionState).remainingSuggestion;
            this.decorations = remaining
                ? createSuggestionDecoration(update.view, remaining)
                : Decoration.none;
        }
    },
    { decorations: (v) => v.decorations }
);
//#endregion

//#region Keyboard Handling
/**
 * Creates keymap handler for accepting suggestion parts
 */
function createSuggestionKeymap(acceptKey: string, forceFetch: () => void, splitStrategy: SplitStrategy) {
    return Prec.highest(
        keymap.of([
            {
                key: acceptKey,
                run: (view: EditorView) => {
                    const state = view.state.field(InlineSuggestionState);
                    if (!state.remainingSuggestion) return false;

                    // Validate document hasn't changed
                    // if (!state.originalDoc?.eq(view.state.doc)) return false;

                    const split = splitStrategy(state.remainingSuggestion);
                    if (!split.accept) return false;

                    view.dispatch({
                        ...insertSuggestionText(view.state, split.accept),
                        effects: InlineSuggestionEffect.of({
                            suggestion: split.remaining || null,
                            doc: split.remaining ? state.originalDoc : null,
                        }),
                    });

                    if (!split.remaining) forceFetch();
                    return true;
                },
            },
        ])
    );
}

/**
 * Helper to create transaction for inserting suggestion text
 */
function insertSuggestionText(state: EditorState, text: string) {
    const cursorPos = state.selection.main.head;
    return {
        ...state.changeByRange((range) => ({
            changes: { from: cursorPos, to: cursorPos, insert: text },
            range: EditorSelection.cursor(cursorPos + text.length),
        })),
        userEvent: 'input.complete',
    };
}
//#endregion

//#region Types and Configuration
type SplitStrategy = (remaining: string) => { accept: string; remaining: string };
type InlineFetchFn = (state: EditorState) => AsyncGenerator<string>;
type InlineSuggestionOptions = {
    fetchFn: (state: EditorState) => AsyncGenerator<string> | Promise<string>;
    splitStrategy?: SplitStrategy;
    delay_ms?: number;
    acceptShortcut?: string;
};

const defaultSplitStrategy: SplitStrategy = (remaining) => {
    // Split by first whitespace for word-by-word
    const firstSpace = remaining.indexOf(' ');
    return firstSpace === -1
        ? { accept: remaining, remaining: '' }
        : { accept: remaining.slice(0, firstSpace + 1), remaining: remaining.slice(firstSpace + 1) };
};

// Example split strategies that can be provided by users:
export const splitStrategies = {
    word: defaultSplitStrategy,

    sentence: (remaining: string) => {
        const sentenceEnd = remaining.match(/[.!?]\s+/);
        return sentenceEnd
            ? {
                accept: remaining.slice(0, sentenceEnd.index! + 1),
                remaining: remaining.slice(sentenceEnd.index! + 1),
            }
            : { accept: remaining, remaining: '' };
    },

    paragraph: (remaining: string) => {
        const paragraphEnd = remaining.indexOf('\n\n');
        return paragraphEnd === -1
            ? { accept: remaining, remaining: '' }
            : {
                accept: remaining.slice(0, paragraphEnd + 2),
                remaining: remaining.slice(paragraphEnd + 2),
            };
    },

    full: (remaining: string) => ({
        accept: remaining,
        remaining: '',
    }),
};
//#endregion

//#region Public API
/**
 * Main extension function combining all components
 */
export function inlineSuggestion(options: InlineSuggestionOptions) {
    const {
        delay_ms = 500,
        acceptShortcut = 'Tab',
        fetchFn: userFetchFn,
        splitStrategy = defaultSplitStrategy,
    } = options;

    // Normalize fetch function to always return AsyncGenerator
    const normalizedFetch = async function* (state: EditorState) {
        const result = await userFetchFn(state);
        if (typeof result === 'string') yield result;
        else yield* result;
    };

    // Add debouncing to fetch function
    const { debouncedGenerator: debouncedFetch, cancelDebounce } = debounceAsyncGenerator(normalizedFetch, delay_ms);

    return [
        InlineSuggestionState,
        createFetchPlugin(debouncedFetch),
        renderPlugin,
        createSuggestionKeymap(acceptShortcut, cancelDebounce, splitStrategy),
    ];
}
//#endregion