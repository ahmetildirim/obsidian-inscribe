import { Editor } from "obsidian";
import { SplitStrategy, Suggestion } from "src/extension";
import { Completer } from "src/providers";

export async function* generateCompletion(editor: Editor, completer: Completer, splitStrategy: SplitStrategy): AsyncGenerator<Suggestion> {
    completer.abort();
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

    for await (const text of completer.generate(editor)) {
        yield { text: text, splitStrategy: splitStrategy };
    }
}

