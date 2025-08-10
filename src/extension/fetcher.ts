import { EditorState } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { SuggestionUpdateEffect, suggestionSessionState } from './session';
import { Suggestion } from './types';

// Creates a debounced fetcher for suggestions.
export const createDebouncedFetcher = (
    fetch: (state: EditorState) => AsyncGenerator<Suggestion>,
    getDelay: () => number,
    autoTriggerEnabled: boolean = true
) => {
    let activeRequest = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Throttled fetch that waits for the debounce interval.
    const throttledFetch = async function* (state: EditorState) {
        clearTimeout(timeoutId);
        activeRequest = true;
        await new Promise((resolve) => {
            timeoutId = setTimeout(resolve, getDelay());
        });
        if (activeRequest) yield* fetch(state);
    };

    // Immediate fetch without debounce (for manual triggers).
    const immediateFetch = async function* (state: EditorState) {
        activeRequest = true;
        if (activeRequest) yield* fetch(state);
    };

    // Plugin that initiates suggestion fetching on document changes.
    const fetcherPlugin = ViewPlugin.fromClass(
        class {
            private currentRequestId = 0;

            async update(update: ViewUpdate) {
                const state = update.state;
                // Only trigger fetch if auto-trigger is enabled and there is no active suggestion.
                if (!autoTriggerEnabled || !update.docChanged || state.field(suggestionSessionState).remainingText)
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

            // Method to manually trigger suggestions (exposed for hotkey use).
            async triggerSuggestion(view: EditorView) {
                const state = view.state;
                // Cancel any active suggestion first.
                view.dispatch({
                    effects: SuggestionUpdateEffect.of({
                        content: null,
                        document: null,
                        anchor: null,
                    }),
                });

                const requestId = ++this.currentRequestId;
                for await (const suggestion of immediateFetch(state)) {
                    // Ignore stale requests.
                    if (requestId !== this.currentRequestId) return;
                    view.dispatch({
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
