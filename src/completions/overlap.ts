// Providers yield the full completion so far, rather than individual deltas.
export function removeOverlap(beforeCursor: string, completion: string): string {
    for (let length = Math.min(beforeCursor.length, completion.length); length > 0; length--) {
        if (beforeCursor.endsWith(completion.slice(0, length))) {
            return completion.slice(length);
        }
    }
    return completion;
}

// A short initial chunk may still grow into a longer copy of the cursor context.
// Hold it until that possibility is resolved, or until the stream ends.
function mayGrowIntoOverlap(beforeCursor: string, completion: string): boolean {
    if (!completion) return false;
    const occurrence = beforeCursor.indexOf(completion);
    return occurrence !== -1 && occurrence + completion.length < beforeCursor.length;
}

export async function* removeStreamingOverlap(
    beforeCursor: string,
    completions: AsyncIterable<string>,
): AsyncGenerator<string> {
    let latest = '';
    let emitted = '';

    for await (const completion of completions) {
        latest = completion;
        if (mayGrowIntoOverlap(beforeCursor, completion)) continue;

        const suggestion = removeOverlap(beforeCursor, completion);
        if (suggestion !== emitted) {
            emitted = suggestion;
            yield suggestion;
        }
    }

    const finalSuggestion = removeOverlap(beforeCursor, latest);
    if (finalSuggestion !== emitted) yield finalSuggestion;
}
