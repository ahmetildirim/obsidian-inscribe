import { Suggestion } from "codemirror-companion-extension";
import { Editor } from "obsidian";
import { Completer } from "src/providers";

export async function* generateCompletion(editor: Editor, completer: Completer): AsyncGenerator<Suggestion> {
    const cursor = editor.getCursor();

    // If the current line is empty, don't suggest anything.
    const currentLine = editor.getLine(cursor.line);
    if (!currentLine.length) {
        yield { display_suggestion: "", complete_suggestion: "" };
        return;
    }

    // Only if the last character is a space or dot, suggest completions.
    const lastChar = currentLine[cursor.ch - 1];
    if (lastChar !== " ") {
        yield { display_suggestion: "", complete_suggestion: "" };
        return;
    }

    const afterCursor = editor.getRange(cursor, { line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length });
    const beforeCursor = editor.getRange({ line: 0, ch: 0 }, cursor);

    yield* completer.generate(editor, beforeCursor, afterCursor);
}
