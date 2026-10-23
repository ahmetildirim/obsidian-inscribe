import { EditorSelection, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { TextSplitStrategies } from './segmentation';
import { InlineCompletionOptions } from './types';
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

// Accepts the next segment of the current suggestion. Returns false if there is none.
export const acceptSuggestion = (
    view: EditorView,
    terminateFetch: () => void,
    getOptions: () => InlineCompletionOptions
): boolean => {
    const session = view.state.field(suggestionSessionState);
    if (!session.remainingText) return false;

    // Always obtain the current split strategy from getOptions.
    const segmentationKey = getOptions().splitStrategy ?? 'word';
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
};

// Returns a key binding that accepts the current suggestion.
// The key is only consumed while a suggestion is shown.
export const createAcceptanceHandler = (
    terminateFetch: () => void,
    hotkey: string,
    getOptions: () => InlineCompletionOptions
) =>
    Prec.highest(
        keymap.of([
            {
                key: hotkey,
                run: (view: EditorView) => acceptSuggestion(view, terminateFetch, getOptions),
            },
        ])
    );

export { insertCompletion };
