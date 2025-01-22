import { ModelResponse, Ollama } from "ollama";
import { Suggestion } from "codemirror-companion-extension";
import { OllamaSettings } from "./settings";
import { Completer, Provider } from "..";
import { Editor } from "obsidian";

export default class OllamaCompleter implements Completer {
    integration: Provider = Provider.OLLAMA;
    client: Ollama
    settings: OllamaSettings;
    aborted: boolean = false;

    constructor(settins: OllamaSettings) {
        this.settings = settins;
        this.client = new Ollama({ host: this.settings.host });
    }

    async *generate(editor: Editor, prefix: string, suffix: string): AsyncGenerator<Suggestion> {
        this.aborted = false;
        const initialCursor = editor.getCursor();

        const completionIterator = await this.client.generate({
            model: this.settings.model,
            prompt: prefix,
            system: "you are one son of a gun",
            stream: true,
        });

        let completion = "";
        for await (let response of completionIterator) {
            if (this.aborted) {
                yield { complete_suggestion: "", display_suggestion: "" };
                return;
            }
            const currentCursor = editor.getCursor();
            if (currentCursor.line !== initialCursor.line || currentCursor.ch !== initialCursor.ch) {
                console.log("cursor moved, aborting completion");
                this.abort();
                yield { complete_suggestion: "", display_suggestion: "" };
                return;
            }
            completion += response.response;
            yield { complete_suggestion: completion, display_suggestion: completion }
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


