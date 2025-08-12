import { EditorSelection, EditorState, Prec } from '@codemirror/state';
import { EditorView, ViewPlugin, keymap } from '@codemirror/view';
import { TextSplitStrategies } from './segmentation';
import { SplitStrategy } from './types';
import { SuggestionUpdateEffect, suggestionSessionState } from './session';

// Helper to create a transaction that inserts completion text.
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

// Returns a key binding that accepts the current suggestion.
export const createAcceptanceHandler = (
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

// Returns a key binding that manually triggers suggestions.
export const createTriggerHandler = (
    fetcherPlugin: ViewPlugin<any>,
    hotkey: string
) =>
    Prec.highest(
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

export { insertCompletion };
