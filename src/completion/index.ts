import { Editor } from "obsidian";
import { Completer } from "src/providers";

export async function* generateCompletion(editor: Editor, completer: Completer): AsyncGenerator<string> {
    const cursor = editor.getCursor();

    // If the current line is empty, don't suggest anything.
    const currentLine = editor.getLine(cursor.line);
    if (!currentLine.length) {
        yield "";
        return;
    }

    // Only if the last character is a space or dot, suggest completions.
    const lastChar = currentLine[cursor.ch - 1];
    if (lastChar !== " ") {
        yield "";
        return;
    }

    for await (const suggestion of completer.generate(editor)) {
        yield suggestion.display_suggestion;
    }
}

