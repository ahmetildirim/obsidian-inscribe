// User interaction handlers for accepting and triggering suggestions

import { ViewPlugin, EditorView, keymap } from '@codemirror/view';
import { EditorState, EditorSelection, Prec } from '@codemirror/state';
import { SplitStrategy, InlineCompletionOptions } from './types';
import { TextSplitStrategies } from './text-strategies';
import { suggestionSessionState, SuggestionUpdateEffect } from './session-state';

// Helper to create a transaction that inserts completion text.
function insertCompletion(state: EditorState, text: string) {
    const cursorPos = state.selection.main.head;
    return {
        ...state.changeByRange(() => ({
            changes: { from: cursorPos, insert: text },
            range: EditorSelection.cursor(cursorPos + text.length),
        })),
        userEvent: 'completion.accept',
    };
}

// Returns a key binding that accepts the current suggestion.
export function createAcceptanceHandler(
    terminateFetch: () => void,
    hotkey: string,
    getOptions: () => InlineCompletionOptions
) {
    return Prec.highest(
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
}

// Returns a key binding that manually triggers suggestions.
export function createTriggerHandler(
    fetcherPlugin: ViewPlugin<any>,
    hotkey: string
) {
    return Prec.highest(
        keymap.of([
            {
                key: hotkey,
                run: (view: EditorView) => {
                    // Get the fetcher plugin instance and trigger suggestion.
                    const pluginInstance = view.plugin(fetcherPlugin);
                    if (pluginInstance && 'triggerSuggestion' in pluginInstance) {
                        (pluginInstance as any).triggerSuggestion(view);
                        return true;
                    }
                    return false;
                },
            },
        ])
    );
}
