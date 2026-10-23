import { EditorState } from '@codemirror/state';
import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { SuggestionUpdateEffect, suggestionSessionState } from './session';
import { Suggestion } from './types';

// View plugin instance that fetches suggestions and can be triggered manually.
export interface SuggestionFetcher extends PluginValue {
    triggerSuggestion(view: EditorView): Promise<void>;
}

// Creates a debounced fetcher for suggestions.
export const createDebouncedFetcher = (
    fetch: (state: EditorState, manual: boolean) => AsyncGenerator<Suggestion>,
    getDelay: () => number,
    isAutoTriggerEnabled: () => boolean
) => {
    let activeRequest = true;
    let timeoutId: number | undefined;

    // Throttled fetch that waits for the debounce interval.
    const throttledFetch = async function* (state: EditorState) {
        window.clearTimeout(timeoutId);
        activeRequest = true;
        await new Promise((resolve) => {
            timeoutId = window.setTimeout(resolve, getDelay());
        });
        if (activeRequest) yield* fetch(state, false);
    };

    // Immediate fetch without debounce (for manual triggers).
    const immediateFetch = async function* (state: EditorState) {
        activeRequest = true;
        yield* fetch(state, true);
    };

    // Plugin that initiates suggestion fetching on document changes.
    const fetcherPlugin: ViewPlugin<SuggestionFetcher> = ViewPlugin.fromClass(
        class implements SuggestionFetcher {
            private currentRequestId = 0;

            update(update: ViewUpdate) {
                void this.fetchOnUpdate(update);
            }

            private async fetchOnUpdate(update: ViewUpdate) {
                const state = update.state;
                // Only trigger fetch if auto-trigger is enabled and there is no active suggestion.
                if (!isAutoTriggerEnabled() || !update.docChanged || state.field(suggestionSessionState).remainingText)
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

            // Method to manually trigger suggestions (exposed for the trigger command).
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
            window.clearTimeout(timeoutId);
        },
    };
};
