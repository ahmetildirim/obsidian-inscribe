// Inline Completions extension for CodeMirror
//
// This extension offers inline suggestions with:
// - Configurable suggestion fetching strategies
// - Multiple text segmentation approaches
// - Debounced network requests
// - Non-invasive suggestion rendering

// Slim orchestrator that wires together modular components.
import { EditorState } from '@codemirror/state';
import { suggestionRenderer } from './renderer';
import { createDebouncedFetcher } from './fetcher';
import { createAcceptanceHandler, createTriggerHandler } from './handlers';
import { suggestionSessionState } from './session';
import type { InlineCompletionConfig, Suggestion } from './types';

// The main extension function. It wires up session state management,
// suggestion fetching, rendering, and user interaction.
export function inlineSuggestions(config: InlineCompletionConfig) {
    const { fetchFunc, getOptions } = config;
    const staticHotkey = config.acceptanceHotkey || 'Tab';
    const autoTriggerEnabled = !config.triggerHotkey;

    // Normalize the fetch function to always return an async generator.
    const normalizeFetch = async function* (state: EditorState) {
        const result = await fetchFunc(state);
        if (Symbol.asyncIterator in (result as any)) {
            yield* (result as AsyncGenerator<Suggestion>);
        } else {
            yield result as Suggestion;
        }
    };

    const getDelay = () => getOptions().delayMs ?? 300;
    const { fetcherPlugin, terminate } = createDebouncedFetcher(
        normalizeFetch,
        getDelay,
        autoTriggerEnabled
    );
    const acceptanceHandler = createAcceptanceHandler(
        terminate,
        staticHotkey,
        getOptions
    );

    const extensions = [
        suggestionSessionState,
        fetcherPlugin,
        suggestionRenderer,
        acceptanceHandler,
    ];

    if (config.triggerHotkey) {
        const triggerHandler = createTriggerHandler(
            fetcherPlugin,
            config.triggerHotkey
        );
        extensions.push(triggerHandler);
    }

    return extensions;
}

export type {
    InlineCompletionConfig,
    InlineCompletionOptions,
    SplitStrategy,
    Suggestion,
} from './types';
