// Inline Completions extension for CodeMirror
//
// This extension offers inline suggestions with:
// - Configurable suggestion fetching strategies
// - Multiple text segmentation approaches
// - Debounced network requests
// - Non-invasive suggestion rendering

// Slim orchestrator that wires together modular components.
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { suggestionRenderer } from './renderer';
import { createDebouncedFetcher } from './fetcher';
import { acceptSuggestion, createAcceptanceHandler } from './handlers';
import { suggestionSessionState } from './session';
import type { InlineCompletionConfig } from './types';

const ACCEPTANCE_HOTKEY = 'Tab';

export interface InlineSuggestions {
    extension: Extension[];
    // Editor views the extension is currently attached to.
    views: ReadonlySet<EditorView>;
    hasSuggestion(view: EditorView): boolean;
    // Accepts the next segment of the current suggestion. Returns false if there is none.
    accept(view: EditorView): boolean;
    // Fetches a suggestion immediately, regardless of the auto trigger setting.
    trigger(view: EditorView): void;
}

// The main extension function. It wires up session state management,
// suggestion fetching, rendering, and user interaction.
export function inlineSuggestions(config: InlineCompletionConfig): InlineSuggestions {
    const { fetchFunc, getOptions } = config;

    // Normalize the fetch function to always return an async generator.
    const normalizeFetch = async function* (state: EditorState, manual: boolean) {
        const result = await fetchFunc(state, manual);
        if (Symbol.asyncIterator in result) {
            yield* result;
        } else {
            yield result;
        }
    };

    const getDelay = () => getOptions().delayMs ?? 300;
    const { fetcherPlugin, terminate } = createDebouncedFetcher(
        normalizeFetch,
        getDelay,
        () => getOptions().autoTrigger ?? true
    );
    const acceptanceHandler = createAcceptanceHandler(
        terminate,
        ACCEPTANCE_HOTKEY,
        getOptions
    );

    const views = new Set<EditorView>();
    const viewTracker = ViewPlugin.define((view) => {
        views.add(view);
        return {
            destroy: () => {
                views.delete(view);
            },
        };
    });

    return {
        extension: [
            suggestionSessionState,
            fetcherPlugin,
            suggestionRenderer,
            acceptanceHandler,
            viewTracker,
        ],
        views,
        hasSuggestion: (view) => Boolean(view.state.field(suggestionSessionState, false)?.remainingText),
        accept: (view) => acceptSuggestion(view, terminate, getOptions),
        trigger: (view) => {
            void view.plugin(fetcherPlugin)?.triggerSuggestion(view);
        },
    };
}

export type {
    InlineCompletionConfig,
    InlineCompletionOptions,
    SplitStrategy,
    Suggestion,
} from './types';
