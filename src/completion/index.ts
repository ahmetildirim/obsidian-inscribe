import { Editor } from "obsidian";
import { Suggestion } from "src/extension";
import { Provider, Providers } from "src/providers";
import { CompletionOptions, DEFAULT_PROFILE, Settings } from "src/settings";

export async function* generateCompletion(editor: Editor, provider: Provider, options: CompletionOptions): AsyncGenerator<Suggestion> {
    await provider.abort();
    const cursor = editor.getCursor();

    // If the current line is empty, don't suggest anything.
    const currentLine = editor.getLine(cursor.line);
    if (!currentLine.length) {
        return;
    }

    // Only if the last character is a space or dot, suggest completions.
    const lastChar = currentLine[cursor.ch - 1];
    if (lastChar !== " ") {
        return;
    }

    for await (const text of provider.generate(editor, options)) {
        yield { text: text };
    }
}

export function resolveProfile(settings: Settings, providers: Providers): [Provider, CompletionOptions] {
    const profile = settings.profiles[DEFAULT_PROFILE];
    const provider = providers[profile.provider];
    const options = profile.completionOptions;
    return [provider, options];
}