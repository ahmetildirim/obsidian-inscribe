import { ModelResponse, Ollama } from "ollama";
import { OllamaSettings } from "./settings";
import { Provider } from "..";
import { Editor } from "obsidian";
import { preparePrompt } from "src/prompt/prompt";
import { CompletionOptions } from "src/settings";

export class OllamaProvider implements Provider {
    client: Ollama
    settings: OllamaSettings;
    aborted: boolean = false;

    constructor(settins: OllamaSettings) {
        this.settings = settins;
        this.client = new Ollama({ host: this.settings.host });
    }

    async *generate(editor: Editor, options: CompletionOptions): AsyncGenerator<string> {
        this.aborted = false;
        const prompt = preparePrompt(editor, options.userPrompt);

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
            const currentPosition = editor.getCursor();
            if (currentPosition.line !== initialPosition.line || currentPosition.ch !== initialPosition.ch) {
                console.log("cursor moved, aborting completion");
                this.abort();
                return;
            }
            completion += response.response;
            yield completion;
        }
    }

    async abort() {
        if (this.aborted) return;
        this.client.abort();
        this.aborted = true;
        console.log("aborted completion");
    }

    async updateModels(): Promise<string[]> {
        const response = await this.client.list();
        return response.models.map((model: ModelResponse) => model.name);
    }
}


