import Mustache from 'mustache';
import { Editor } from 'obsidian';

export const TEMPLATE_VARIABLES = `{{pre_cursor}}\n{{post_cursor}} \n{{active_sentence}} \n{{last_line}}`;

interface TemplateArgs {
    pre_cursor: string;
    post_cursor: string;
    active_sentence: string;
    last_line: string;
}

export function buildPrompt(template: string, args: TemplateArgs): string {
    return Mustache.render(template, args);
}

export function preparePrompt(editor: Editor, template: string = TEMPLATE_VARIABLES): string {
    const cursor = editor.getCursor();
    const preCursor = editor.getRange({ line: 0, ch: 0 }, cursor);
    const postCursor = editor.getRange(cursor, { line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length });
    const activeSentence = sentenceAtCursor(editor);
    const lastLine = editor.getLine(editor.lastLine());

    return buildPrompt(template, {
        pre_cursor: preCursor,
        post_cursor: postCursor,
        active_sentence: activeSentence,
        last_line: lastLine
    });
}

function sentenceAtCursor(editor: Editor): string {
    const cursor = editor.getCursor();
    let currentLine = cursor.line;
    let sentenceLines = [editor.getLine(currentLine)];

    // Search backwards until sentence start found
    while (currentLine > 0) {
        currentLine--;
        const line = editor.getLine(currentLine);

        // Check if previous line ends with sentence ending
        if (/[.!?]\s*$/.test(line)) {
            break;
        }

        sentenceLines.unshift(line);
    }

    // Join lines and clean up whitespace
    return sentenceLines
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}