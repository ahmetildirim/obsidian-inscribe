import Mustache from 'mustache';

interface TemplateArgs {
    user_prompt: string;
    leading_context: string;
    trailing_context: string;
    active_sentence: string;
    last_line: string;
}

export function buildPrompt(template: string, args: TemplateArgs): string {
    return Mustache.render(template, args);
}