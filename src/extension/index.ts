/**
 * Intelligent Inline Completions for CodeMirror
 *
 * This extension offers AI-powered inline suggestions with:
 * - Configurable suggestion fetching strategies
 * - Multiple text segmentation approaches
 * - Debounced network requests
 * - Non-invasive suggestion rendering
 */

import {
    ViewPlugin,
    EditorView,
    ViewUpdate,
    Decoration,
    WidgetType,
    keymap,
} from '@codemirror/view';
import {
    StateEffect,
    Text,
    StateField,
    EditorState,
    EditorSelection,
    Transaction,
    Prec,
} from '@codemirror/state';

/* --------------------------------------------------------------------------
   Type Definitions
---------------------------------------------------------------------------- */

/** Supported segmentation strategies */
export type SplitStrategy = keyof typeof TextSplitStrategies;

/** Inline suggestion structure – now only carries text. */
export interface Suggestion {
    text: string;
}

/** Inline completion configuration.
 * 
 * Note: Instead of each suggestion carrying its split strategy,
 * you supply a dynamic getter function (`getOptions`) so that the extension
 * always uses the current settings.
 */
export interface InlineCompletionConfig {
    fetchFunc: (
        state: EditorState
    ) => AsyncGenerator<Suggestion> | Promise<Suggestion>;
    /** (Optional) A static hotkey for accepting suggestions. */
    acceptanceHotkey?: string;
    /** A function that returns current options. */
    getOptions: () => InlineCompletionOptions;
}

export interface InlineCompletionOptions {
    delayMs?: number;
    splitStrategy?: SplitStrategy;
}

/** Internal state for the current suggestion session.
 * Note: The previous "segmentation" property has been removed.
 */
interface SuggestionSession {
    fullText: string | null;
    remainingText: string | null;
    baselineDocument: Text | null;
    anchorPosition: number | null;
}

/* --------------------------------------------------------------------------
   Text Segmentation Strategies
---------------------------------------------------------------------------- */

/**
 * A set of text splitting functions used to determine how much of the
 * suggestion to accept when triggered.
 */
const TextSplitStrategies = {
    /**
     * Word-level segmentation (space-delimited).
     * Accepts text until (and including) the first space.
     */
    word: (text: string) => {
        const nextSpace = text.indexOf(' ');
        return nextSpace === -1
            ? { accepted: text, remaining: '' }
            : {
                accepted: text.slice(0, nextSpace + 1),
                remaining: text.slice(nextSpace + 1),
            };
    },

    /**
     * Sentence-level segmentation (punctuation followed by whitespace).
     */
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

    /**
     * Paragraph-level segmentation (double newline).
     */
    paragraph: (text: string) => {
        const paragraphEnd = text.indexOf('\n\n');
        return paragraphEnd === -1
            ? { accepted: text, remaining: '' }
            : {
                accepted: text.slice(0, paragraphEnd + 2),
                remaining: text.slice(paragraphEnd + 2),
            };
    },

    /**
     * Atomic acceptance – consume the entire suggestion.
     */
    full: (text: string) => ({ accepted: text, remaining: '' }),
} as const;

/* --------------------------------------------------------------------------
   Suggestion Session State Management
---------------------------------------------------------------------------- */

/**
 * Effect to update the suggestion session state.
 * A `null` content signals a reset.
 */
const SuggestionUpdateEffect = StateEffect.define<{
    content: string | null;
    document: Text | null;
    anchor: number | null;
}>();

/**
 * The state field that holds the current suggestion session.
 */
const suggestionSessionState = StateField.define<SuggestionSession>({
    create: () => getResetSession(),

    update(session, transaction) {
        // Process explicit session update effects.
        const effect = transaction.effects.find((e) =>
            e.is(SuggestionUpdateEffect)
        );
        if (effect) return updateSessionFromEffect(effect.value);

        // If the document has changed, adjust the session.
        if (
            transaction.docChanged &&
            session.remainingText &&
            session.anchorPosition !== null
        ) {
            return updateSessionOnDocumentChange(session, transaction);
        }

        // If there is an active suggestion but the cursor has moved, cancel it.
        if (session.remainingText !== null && session.anchorPosition !== null) {
            return updateSessionOnCursorDrift(session, transaction);
        }

        return session;
    },
});

/**
 * Creates a fresh, empty suggestion session.
 */
function getResetSession(): SuggestionSession {
    return {
        fullText: null,
        remainingText: null,
        baselineDocument: null,
        anchorPosition: null,
    };
}

/**
 * Update session state based on an incoming effect.
 */
function updateSessionFromEffect(effect: {
    content: string | null;
    document: Text | null;
    anchor: number | null;
}): SuggestionSession {
    return effect.content === null
        ? getResetSession()
        : initializeSession(effect as {
            content: string;
            document: Text;
            anchor: number;
        });
}

/**
 * Initializes a new suggestion session with provided effect data.
 */
function initializeSession(effect: {
    content: string;
    document: Text;
    anchor: number;
}): SuggestionSession {
    return {
        fullText: effect.content,
        remainingText: effect.content,
        baselineDocument: effect.document,
        anchorPosition: effect.anchor,
    };
}

/**
 * Adjust the suggestion session in response to document changes.
 */
function updateSessionOnDocumentChange(
    session: SuggestionSession,
    transaction: Transaction
): SuggestionSession {
    let insertedContent = '';
    let insertionAtAnchor = false;

    // Iterate over document changes to detect an insertion at the suggestion's anchor.
    transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
        if (fromA === session.anchorPosition && toA === fromA) {
            insertedContent = inserted.toString();
            insertionAtAnchor = true;
        }
    });

    if (!insertionAtAnchor || !session.remainingText) {
        return invalidateSession(session);
    }

    // Verify the inserted text matches the pending suggestion.
    if (session.remainingText.startsWith(insertedContent)) {
        return advanceSession(session, insertedContent.length);
    }

    return invalidateSession(session);
}

/**
 * Advance the session by consuming accepted text.
 */
function advanceSession(
    session: SuggestionSession,
    consumedLength: number
): SuggestionSession {
    return {
        ...session,
        remainingText:
            session.remainingText!.slice(consumedLength).length > 0
                ? session.remainingText!.slice(consumedLength)
                : null,
        anchorPosition: session.anchorPosition! + consumedLength,
    };
}

/**
 * Invalidate the session, effectively cancelling any pending suggestion.
 */
function invalidateSession(session: SuggestionSession): SuggestionSession {
    return {
        ...session,
        remainingText: null,
        anchorPosition: null,
    };
}

/**
 * Cancel the suggestion if the cursor has drifted away.
 */
function updateSessionOnCursorDrift(
    session: SuggestionSession,
    transaction: Transaction
): SuggestionSession {
    return transaction.state.selection.main.head !== session.anchorPosition
        ? invalidateSession(session)
        : session;
}

/* --------------------------------------------------------------------------
   Suggestion Rendering (Visualization Layer)
---------------------------------------------------------------------------- */

/**
 * Widget for rendering inline suggestion text.
 */
class SuggestionWidget extends WidgetType {
    static readonly OPACITY = 0.4;
    static readonly CSS_CLASS = 'cm-inline-prediction';

    constructor(private readonly content: string) {
        super();
    }

    toDOM(): HTMLElement {
        const span = document.createElement('span');
        span.className = SuggestionWidget.CSS_CLASS;
        span.style.opacity = SuggestionWidget.OPACITY.toString();
        span.textContent = this.content;
        return span;
    }
}

/**
 * Plugin that renders inline suggestion decorations.
 */
const suggestionRenderer = ViewPlugin.fromClass(
    class {
        decorations = Decoration.none;

        update(update: ViewUpdate) {
            const session = update.state.field(suggestionSessionState);
            this.decorations = session.remainingText
                ? this.createDecoration(update.view, session.remainingText)
                : Decoration.none;
        }

        private createDecoration(view: EditorView, suggestionText: string) {
            const cursorPosition = view.state.selection.main.head;
            return Decoration.set([
                Decoration.widget({
                    widget: new SuggestionWidget(suggestionText),
                    side: 1,
                }).range(cursorPosition),
            ]);
        }
    },
    { decorations: (v) => v.decorations }
);

/* --------------------------------------------------------------------------
   Suggestion Fetching (Debounced Fetcher)
---------------------------------------------------------------------------- */

/**
 * Creates a debounced fetcher for suggestions.
 *
 * @param fetch - The suggestion fetch function.
 * @param getDelay - A function returning the current debounce delay in milliseconds.
 */
const createDebouncedFetcher = (
    fetch: (state: EditorState) => AsyncGenerator<Suggestion>,
    getDelay: () => number
) => {
    let activeRequest = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    /**
     * Throttled fetch that waits for the debounce interval.
     */
    const throttledFetch = async function* (state: EditorState) {
        clearTimeout(timeoutId);
        activeRequest = true;
        await new Promise((resolve) => {
            timeoutId = setTimeout(resolve, getDelay());
        });
        if (activeRequest) yield* fetch(state);
    };

    /**
     * Plugin that initiates suggestion fetching on document changes.
     */
    const fetcherPlugin = ViewPlugin.fromClass(
        class {
            private currentRequestId = 0;

            async update(update: ViewUpdate) {
                const state = update.state;
                // Only trigger fetch if there is no active suggestion.
                if (!update.docChanged || state.field(suggestionSessionState).remainingText)
                    return;

                const requestId = ++this.currentRequestId;
                for await (const suggestion of throttledFetch(state)) {
                    // Ignore stale requests.
                    if (requestId !== this.currentRequestId) return;
                    update.view.dispatch({
                        effects: SuggestionUpdateEffect.of({
                            content: suggestion.text,
                            document: state.doc,
                            anchor: state.selection.main.head,
                        }),
                    });
                }
            }
        }
    );

    return {
        fetcherPlugin,
        terminate: () => {
            activeRequest = false;
            clearTimeout(timeoutId);
        },
    };
};

/* --------------------------------------------------------------------------
   User Interaction (Acceptance Handler)
---------------------------------------------------------------------------- */

/**
 * Returns a key binding that accepts the current suggestion.
 *
 * @param terminateFetch - Function to stop further fetching.
 * @param hotkey - The key that triggers acceptance.
 * @param getOptions - Function returning dynamic options (including splitStrategy).
 */
const createAcceptanceHandler = (
    terminateFetch: () => void,
    hotkey: string,
    getOptions: () => { delayMs?: number; splitStrategy?: SplitStrategy }
) =>
    Prec.highest(
        keymap.of([
            {
                key: hotkey,
                run: (view: EditorView) => {
                    const session = view.state.field(suggestionSessionState);
                    if (!session.remainingText) return false;

                    // Always obtain the current split strategy from getOptions.
                    const dynamicOptions = getOptions();
                    const segmentationKey = dynamicOptions.splitStrategy ?? 'word';
                    const { accepted, remaining } =
                        TextSplitStrategies[segmentationKey](session.remainingText);

                    if (!accepted) return false;

                    // Insert the accepted suggestion text.
                    view.dispatch({
                        ...insertCompletion(view.state, accepted),
                        effects: SuggestionUpdateEffect.of({
                            content: remaining || null,
                            document: remaining ? session.baselineDocument : null,
                            anchor: remaining ? session.anchorPosition! + accepted.length : null,
                        }),
                    });

                    if (!remaining) terminateFetch();
                    return true;
                },
            },
        ])
    );

/**
 * Helper to create a transaction that inserts completion text.
 */
const insertCompletion = (state: EditorState, text: string) => {
    const cursorPos = state.selection.main.head;
    return {
        ...state.changeByRange(() => ({
            changes: { from: cursorPos, insert: text },
            range: EditorSelection.cursor(cursorPos + text.length),
        })),
        userEvent: 'completion.accept',
    };
};

/* --------------------------------------------------------------------------
   Public API
---------------------------------------------------------------------------- */

/**
 * The main extension function. It wires up session state management,
 * suggestion fetching, rendering, and user interaction.
 *
 * Notice that the suggestion now only contains text.
 * The split strategy is always obtained dynamically via `getOptions()`.
 */
export function inlineSuggestions(config: InlineCompletionConfig) {
    const { fetchFunc, getOptions } = config;
    // Use the hotkey from the config if provided; otherwise, default to "Tab".
    const staticHotkey = config.acceptanceHotkey || 'Tab';

    // Normalize the fetch function to always return an async generator.
    const normalizeFetch = async function* (state: EditorState) {
        const result = await fetchFunc(state);
        if (Symbol.asyncIterator in result) {
            yield* result as AsyncGenerator<Suggestion>;
        } else {
            yield result as Suggestion;
        }
    };

    // Use getOptions() to obtain the current debounce delay.
    const getDelay = () => getOptions().delayMs ?? 300;
    const { fetcherPlugin, terminate } = createDebouncedFetcher(normalizeFetch, getDelay);
    const acceptanceHandler = createAcceptanceHandler(terminate, staticHotkey, getOptions);

    return [
        suggestionSessionState,
        fetcherPlugin,
        suggestionRenderer,
        acceptanceHandler,
    ];
}
