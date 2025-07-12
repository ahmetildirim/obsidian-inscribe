// Suggestion rendering (visualization layer)

import { ViewPlugin, EditorView, ViewUpdate, Decoration, WidgetType } from '@codemirror/view';
import { suggestionSessionState } from './session-state';

// Widget for rendering inline suggestion text.
class SuggestionWidget extends WidgetType {
    static readonly CSS_CLASSES = ['cm-inline-prediction', 'inscribe-inline-prediction'];

    constructor(private readonly content: string) {
        super();
    }

    toDOM(): HTMLElement {
        const span = document.createElement('span');
        span.classList.add(...SuggestionWidget.CSS_CLASSES);
        span.textContent = this.content;
        return span;
    }
}

// Plugin that renders inline suggestion decorations.
export const suggestionRenderer = ViewPlugin.fromClass(
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
