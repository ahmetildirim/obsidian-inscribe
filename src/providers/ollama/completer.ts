import { ModelResponse, Ollama } from "ollama";
import { Suggestion } from "codemirror-companion-extension";
import { OllamaSettings } from "./settings";
import { Completer, Provider } from "..";
import { Editor } from "obsidian";
import { preparePrompt } from "src/completion/prompt";

export default class OllamaCompleter implements Completer {
    integration: Provider = Provider.OLLAMA;
    client: Ollama
    settings: OllamaSettings;
    aborted: boolean = false;

    constructor(settins: OllamaSettings) {
        this.settings = settins;
        this.client = new Ollama({ host: this.settings.host });
    }

    async *generate(editor: Editor): AsyncGenerator<string> {
        this.aborted = false;
        const prompt = preparePrompt(editor, this.settings.user_prompt);

        const completionIterator = await this.client.generate({
            model: this.settings.model,
            prompt: prompt,
            system: this.settings.system_prompt,
            stream: true,
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

    async availableModels(): Promise<string[]> {
        const response = await this.client.list();
        return response.models.map((model: ModelResponse) => model.name);
    }
}


