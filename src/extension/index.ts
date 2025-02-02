/**
 * Intelligent Inline Completions for CodeMirror
 * 
 * A sophisticated extension offering AI-powered inline suggestions with:
 * - Configurable suggestion fetching strategies
 * - Multiple text segmentation approaches
 * - Debounced network requests
 * - Non-invasive suggestion rendering
 */

import { ViewPlugin, EditorView, ViewUpdate, Decoration, WidgetType, keymap } from '@codemirror/view';
import { StateEffect, Text, Prec, StateField, EditorState, EditorSelection, Transaction } from '@codemirror/state';

// ---------------------------------- Type Definitions ----------------------------------
export type SplitStrategy = keyof typeof TextSplitStrategies;

export interface Suggestion {
    text: string;
    splitStrategy: SplitStrategy;
}

export interface InlineCompletionConfig {
    fetchFunc: (state: EditorState) => AsyncGenerator<Suggestion> | Promise<Suggestion>;
    delayMs?: number;
    acceptanceHotkey?: string;
}

interface SuggestionSession {
    fullText: string | null;
    remainingText: string | null;
    baselineDocument: Text | null;
    segmentation: SplitStrategy | null;
    anchorPosition: number | null;
}

// ---------------------------------- Text Segmentation Strategies ----------------------------------
const TextSplitStrategies = {
    /**
     * Word-level segmentation (space-delimited)
     * Accepts until next whitespace, including trailing space
     */
    word: (text: string) => {
        const nextWhitespace = text.indexOf(' ');
        return nextWhitespace === -1
            ? { accepted: text, remaining: '' }
            : {
                accepted: text.slice(0, nextWhitespace + 1),
                remaining: text.slice(nextWhitespace + 1)
            };
    },

    /**
     * Sentence-level segmentation (punctuation followed by whitespace)
     */
    sentence: (text: string) => {
        const sentenceTerminus = text.match(/[.!?]\s+/);
        return sentenceTerminus
            ? {
                accepted: text.slice(0, sentenceTerminus.index! + 1),
                remaining: text.slice(sentenceTerminus.index! + 1)
            }
            : { accepted: text, remaining: '' };
    },

    /**
     * Paragraph-level segmentation (double newline)
     */
    paragraph: (text: string) => {
        const paragraphEnd = text.indexOf('\n\n');
        return paragraphEnd === -1
            ? { accepted: text, remaining: '' }
            : {
                accepted: text.slice(0, paragraphEnd + 2),
                remaining: text.slice(paragraphEnd + 2)
            };
    },

    /**
     * Atomic acceptance - consume entire suggestion
     */
    full: (text: string) => ({ accepted: text, remaining: '' }),
} as const;

// ---------------------------------- State Management ----------------------------------
const SuggestionUpdateEffect = StateEffect.define<{
    content: string | null;
    strategy: SplitStrategy | null;
    document: Text | null;
    anchor: number | null;
}>();

const suggestionSessionState = StateField.define<SuggestionSession>({
    create: () => ({
        fullText: null,
        remainingText: null,
        baselineDocument: null,
        segmentation: null,
        anchorPosition: null,
    }),

    update(currentSession, transaction) {
        const effect = transaction.effects.find(e => e.is(SuggestionUpdateEffect));
        if (effect) return handleEffectUpdate(effect.value);

        if (transaction.docChanged && currentSession.remainingText && currentSession.anchorPosition !== null) {
            return handleDocumentMutation(currentSession, transaction);
        }

        if (currentSession.remainingText !== null && currentSession.anchorPosition !== null) {
            return handleCursorDrift(currentSession, transaction);
        }

        return currentSession;
    }
});

const handleEffectUpdate = (effect: {
    content: string | null;
    strategy: SplitStrategy | null;
    document: Text | null;
    anchor: number | null;
}): SuggestionSession => effect.content === null
        ? createNewSession()
        : initializeSession(effect as { content: string; strategy: SplitStrategy; document: Text; anchor: number });

const createNewSession = (): SuggestionSession => ({
    fullText: null,
    remainingText: null,
    baselineDocument: null,
    segmentation: null,
    anchorPosition: null,
});

const initializeSession = (effect: {
    content: string;
    strategy: SplitStrategy;
    document: Text;
    anchor: number;
}): SuggestionSession => ({
    fullText: effect.content,
    remainingText: effect.content,
    baselineDocument: effect.document,
    segmentation: effect.strategy,
    anchorPosition: effect.anchor,
});

const handleDocumentMutation = (
    session: SuggestionSession,
    transaction: Transaction
): SuggestionSession => {
    let insertedContent = '';
    let insertionAtAnchor = false;

    transaction.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        if (fromA === session.anchorPosition && toA === fromA) {
            insertedContent = inserted.toString();
            insertionAtAnchor = true;
        }
    });

    if (!insertionAtAnchor || !session.remainingText) return invalidateSession(session);

    return session.remainingText.startsWith(insertedContent)
        ? advanceSession(session, insertedContent.length)
        : invalidateSession(session);
};

const advanceSession = (session: SuggestionSession, consumedLength: number): SuggestionSession => ({
    ...session,
    remainingText: session.remainingText!.slice(consumedLength) || null,
    anchorPosition: session.anchorPosition! + consumedLength,
});

const invalidateSession = (session: SuggestionSession): SuggestionSession => ({
    ...session,
    remainingText: null,
    anchorPosition: null,
});

const handleCursorDrift = (session: SuggestionSession, transaction: Transaction): SuggestionSession =>
    transaction.state.selection.main.head !== session.anchorPosition
        ? invalidateSession(session)
        : session;

// ---------------------------------- Visualization Layer ----------------------------------
class SuggestionWidget extends WidgetType {
    static readonly STYLE_OPACITY = 0.4;
    static readonly CSS_CLASS = 'cm-inline-prediction';

    constructor(private readonly content: string) { super(); }

    toDOM() {
        const element = document.createElement('span');
        element.className = SuggestionWidget.CSS_CLASS;
        element.style.opacity = SuggestionWidget.STYLE_OPACITY.toString();
        element.textContent = this.content;
        return element;
    }
}

const renderSuggestions = ViewPlugin.fromClass(
    class {
        decorations = Decoration.none;

        update(update: ViewUpdate) {
            const remaining = update.state.field(suggestionSessionState).remainingText;
            this.decorations = remaining
                ? this.createDecoration(update.view, remaining)
                : Decoration.none;
        }

        private createDecoration(view: EditorView, text: string) {
            const cursorPos = view.state.selection.main.head;
            return Decoration.set([
                Decoration.widget({
                    widget: new SuggestionWidget(text),
                    side: 1,
                }).range(cursorPos),
            ]);
        }
    },
    { decorations: v => v.decorations }
);

// ---------------------------------- Suggestion Fetching System ----------------------------------
const createDebouncedFetcher = (
    fetch: (state: EditorState) => AsyncGenerator<Suggestion>,
    delay: number
) => {
    let activeRequestId = 0;
    let timeout: NodeJS.Timeout;
    let isActive = true;

    const throttledFetch = async function* (state: EditorState) {
        clearTimeout(timeout);
        isActive = true;

        await new Promise(resolve => {
            timeout = setTimeout(resolve, delay);
        });

        if (isActive) yield* fetch(state);
    };

    const fetcherPlugin = ViewPlugin.fromClass(
        class {
            private currentRequestId = 0;

            async update(update: ViewUpdate) {
                const state = update.state;
                if (!update.docChanged || state.field(suggestionSessionState).remainingText) return;

                const requestId = ++this.currentRequestId;
                for await (const suggestion of throttledFetch(state)) {
                    if (requestId !== this.currentRequestId) return;
                    update.view.dispatch({
                        effects: SuggestionUpdateEffect.of({
                            content: suggestion.text,
                            strategy: suggestion.splitStrategy,
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
            isActive = false;
            clearTimeout(timeout);
        }
    };
};

// ---------------------------------- User Interaction Handling ----------------------------------
const createAcceptanceHandler = (terminateFetch: () => void, hotkey: string) => {
    return Prec.highest(
        keymap.of([{
            key: hotkey,
            run: (view: EditorView) => {
                const session = view.state.field(suggestionSessionState);
                if (!session.remainingText) return false;

                const strategy = session.segmentation ?? 'word';
                const { accepted, remaining } = TextSplitStrategies[strategy](session.remainingText);

                if (!accepted) return false;

                view.dispatch({
                    ...insertCompletion(view.state, accepted),
                    effects: SuggestionUpdateEffect.of({
                        content: remaining || null,
                        document: remaining ? session.baselineDocument : null,
                        strategy: remaining ? session.segmentation : null,
                        anchor: remaining ? (session.anchorPosition! + accepted.length) : null,
                    }),
                });

                if (!remaining) terminateFetch();
                return true;
            },
        }])
    );
};

const insertCompletion = (state: EditorState, text: string) => {
    const cursor = state.selection.main.head;
    return {
        ...state.changeByRange(range => ({
            changes: { from: cursor, insert: text },
            range: EditorSelection.cursor(cursor + text.length)
        })),
        userEvent: 'completion.accept',
    };
};

// ---------------------------------- Public API ----------------------------------
export function inlineSuggestions(config: InlineCompletionConfig) {
    const {
        delayMs: debounceInterval = 300,
        acceptanceHotkey = 'Tab',
        fetchFunc: fetchSuggestions
    } = config;

    const normalizeFetch = async function* (state: EditorState) {
        const result = await fetchSuggestions(state);
        if (Symbol.asyncIterator in result) {
            yield* result as AsyncGenerator<Suggestion>;
        } else {
            yield result as Suggestion;
        }
    };

    const { fetcherPlugin, terminate } = createDebouncedFetcher(normalizeFetch, debounceInterval);
    const acceptanceHandler = createAcceptanceHandler(terminate, acceptanceHotkey);

    return [
        suggestionSessionState,
        fetcherPlugin,
        renderSuggestions,
        acceptanceHandler
    ];
}