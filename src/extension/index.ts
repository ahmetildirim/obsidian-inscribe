// Inline Completions extension for CodeMirror
//
// This extension offers inline suggestions with:
// - Configurable suggestion fetching strategies
// - Multiple text segmentation approaches
// - Debounced network requests
// - Non-invasive suggestion rendering

import { EditorState } from '@codemirror/state';
import { InlineCompletionConfig, Suggestion } from './types';
import { suggestionSessionState } from './session-state';
import { suggestionRenderer } from './renderer';
import { createDebouncedFetcher } from './fetcher';
import { createAcceptanceHandler, createTriggerHandler } from './handlers';

// Re-export types for external use
export type { SplitStrategy, Suggestion, InlineCompletionConfig, InlineCompletionOptions } from './types';

/**
 * Creates an inline suggestions extension for CodeMirror.
 * 
 * The main extension function that wires up session state management,
 * suggestion fetching, rendering, and user interaction.
 * The split strategy is always obtained dynamically via `getOptions()`.
 */
export function inlineSuggestions(config: InlineCompletionConfig) {
    const { fetchFunc, getOptions } = config;
    // Use the hotkey from the config if provided; otherwise, default to "Tab".
    const staticHotkey = config.acceptanceHotkey || 'Tab';
    // Determine if auto-trigger should be disabled when trigger hotkey is set.
    const autoTriggerEnabled = !config.manualActivationKey;

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
    const { fetcherPlugin, terminate } = createDebouncedFetcher(normalizeFetch, getDelay, autoTriggerEnabled);
    const acceptanceHandler = createAcceptanceHandler(terminate, staticHotkey, getOptions);

    // Only include trigger handler if trigger hotkey is specified.
    const extensions = [
        suggestionSessionState,
        fetcherPlugin,
        suggestionRenderer,
        acceptanceHandler,
    ];

    if (autoTriggerEnabled) {
        const hotkey = String(config.manualActivationKey);
        const triggerHandler = createTriggerHandler(fetcherPlugin, hotkey);
        extensions.push(triggerHandler);
    }

    return extensions;
}
