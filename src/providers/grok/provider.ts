import { Provider } from "..";
import { Editor } from "obsidian";
import OpenAI from "openai";
import { ProfileOptions } from "src/settings/settings";
import { GrokSettings } from ".";

export class GrokProvider implements Provider {
    private static readonly BASE_URL = "https://api.x.ai/v1";
    client: OpenAI;
    settings: GrokSettings;
    aborted: boolean = false;
    abortcontroller?: AbortController;

    constructor(settings: GrokSettings) {
        this.settings = settings;
        this.client = new OpenAI({
            baseURL: GrokProvider.BASE_URL,
            apiKey: this.settings.apiKey,
            dangerouslyAllowBrowser: true,
        });
    }

    async *generate(editor: Editor, prompt: string, options: ProfileOptions): AsyncGenerator<string> {
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
        this.abortcontroller?.abort();
    }

    async fetchModels(): Promise<string[]> {
        if (!this.client) {
            return this.settings.models;
        }

        const models = await this.client.models.list();
        return models.data.map(model => model.id);
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
