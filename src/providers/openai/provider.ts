import { Provider } from "..";
import { Editor } from "obsidian";
import { OpenAISettings } from ".";
import { ProviderOptions } from "src/settings/settings";
import OpenAI from "openai";

export class OpenAIProvider implements Provider {
    client: OpenAI;
    settings: OpenAISettings;
    aborted: boolean = false;
    abortcontroller: AbortController;

    constructor(settings: OpenAISettings) {
        this.settings = settings;
        this.client = new OpenAI({
            apiKey: this.settings.apiKey,
            dangerouslyAllowBrowser: true,
        });
    }

    async *generate(editor: Editor, prompt: string, options: ProviderOptions): AsyncGenerator<string> {
        this.aborted = false;
        this.abortcontroller = new AbortController();

        const initialPosition = editor.getCursor();
        const stream = await this.client.chat.completions.create({
            model: options.model,
            messages: [
                { role: "system", content: options.systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: options.temperature,
            stream: true,
        }, { signal: this.abortcontroller.signal });

        let completion = "";
        for await (const chunk of stream) {
            if (this.aborted) {
                return;
            }

            if (this.cursorMoved(editor, initialPosition)) {
                this.abort();
                return;
            }

            const content = chunk.choices[0]?.delta?.content || "";
            completion += content;
            yield completion;
        }
    }

    async abort() {
        if (this.aborted) return;
        this.aborted = true;
        this.abortcontroller.abort();
    }

    async fetchModels(): Promise<string[]> {
        if (!this.client) {
            return this.settings.models;
        }

        const models = await this.client.models.list();
        // Filter for chat models only
        const chatModels = models.data
            .filter(model => model.id.includes("gpt"))
            .map(model => model.id);
        return chatModels;
    }

    async connectionTest(): Promise<boolean> {
        try {
            await this.client.models.list();
            return true;
        } catch (error) {
            console.error("Error testing connection:", error);
            return false;
        }
    }

    private cursorMoved(editor: Editor, initialPosition: { line: number, ch: number }): boolean {
        const currentPosition = editor.getCursor();
        return currentPosition.line !== initialPosition.line || currentPosition.ch !== initialPosition.ch;
    }
}

// Import this at the end to avoid circular dependency issues
import preparePrompt from "src/completions/prompt";