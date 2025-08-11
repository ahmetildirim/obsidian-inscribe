import { ModelResponse, Ollama } from "ollama";
import { OllamaSettings } from "./settings";
import { Provider } from "..";
import { Editor } from "obsidian";
import { ProviderOptions } from "src/settings/settings";

export class OllamaProvider implements Provider {
    client: Ollama
    settings: OllamaSettings;
    aborted: boolean = false;

    constructor(settins: OllamaSettings) {
        this.settings = settins;
        this.client = new Ollama({ host: this.settings.host });
    }

    async *generate(editor: Editor, prompt: string, options: ProviderOptions): AsyncGenerator<string> {
        this.aborted = false;

        const completionIterator = await this.client.generate({
            model: options.model,
            prompt: prompt,
            system: options.systemPrompt,
            stream: true,
            options: {
                temperature: options.temperature,
            }
        });

        const initialPosition = editor.getCursor();
        let completion = "";
        for await (let response of completionIterator) {
            if (this.aborted) {
                return;
            }
            if (this.cursorMoved(editor, initialPosition)) {
                this.abort();
                return;
            }
            completion += response.response;
            yield completion;
        }
    }

    private cursorMoved(editor: Editor, initialPosition: { line: number, ch: number }): boolean {
        const currentPosition = editor.getCursor();
        return currentPosition.line !== initialPosition.line || currentPosition.ch !== initialPosition.ch;
    }

    async abort() {
        if (this.aborted) return;
        this.client.abort();
        this.aborted = true;
    }

    async fetchModels(): Promise<string[]> {
        const response = await this.client.list();
        return response.models.map((model: ModelResponse) => model.name);
    }

    async connectionTest(): Promise<boolean> {
        try {
            await this.client.list();
            return true;
        } catch (error) {
            console.error("Error testing connection:", error);
            return false;
        }
    }
}


