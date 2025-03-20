import { Provider } from "..";
import { Editor } from "obsidian";
import { OpenAISettings } from ".";
import { CompletionOptions } from "src/settings/settings";
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

    async *generate(editor: Editor, options: CompletionOptions): AsyncGenerator<string> {
        this.aborted = false;
        this.abortcontroller = new AbortController();

        const initialPosition = editor.getCursor();
        const prompt = preparePrompt(editor, options.userPrompt);

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

            const currentPosition = editor.getCursor();
            if (currentPosition.line !== initialPosition.line || currentPosition.ch !== initialPosition.ch) {
                console.log("cursor moved, aborting completion");
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
        console.log("aborted completion");
    }

    async updateModels(): Promise<string[]> {
        if (!this.client) {
            return this.settings.models;
        }

        const models = await this.client.models.list();
        // Filter for chat models only
        const chatModels = models.data
            .filter(model => model.id.includes("gpt"))
            .map(model => model.id);

        this.settings.models = chatModels;
        return chatModels;
    }
}

// Import this at the end to avoid circular dependency issues
import preparePrompt from "src/prompt/prompt";