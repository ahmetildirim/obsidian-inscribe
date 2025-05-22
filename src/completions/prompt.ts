import Mustache from 'mustache';
import { Editor } from 'obsidian';
import nlp from 'compromise/one'

export const TEMPLATE_VARIABLES = `{{{pre_cursor}}}\n{{{post_cursor}}} \n{{{active_sentence}}} \n{{{last_line}}}`;

interface TemplateArgs {
    pre_cursor: string;
    post_cursor: string;
    active_sentence: string;
    last_line: string;
}

export default function preparePrompt(editor: Editor, template: string = TEMPLATE_VARIABLES): string {
    const cursor = editor.getCursor();
    const preCursor = editor.getRange({ line: 0, ch: 0 }, cursor);
    const postCursor = editor.getRange(cursor, { line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length });
    const activeSentence = nlp(preCursor).fullSentences().last().out('text');
    const lastLine = editor.getLine(editor.lastLine());

    return renderTemplate(template, {
        pre_cursor: preCursor,
        post_cursor: postCursor,
        active_sentence: activeSentence,
        last_line: lastLine
    });
}

function renderTemplate(template: string, args: TemplateArgs): string {
    return Mustache.render(template, args, {}, { escape: (text) => text });
}
