import { ListResponse, ModelResponse, Ollama } from "ollama";
import { Suggestion } from "codemirror-companion-extension";
import { OllamaSettings } from "./settings";
import { Completer } from "..";

export default class OllamaCompleter implements Completer {
    client: Ollama
    settings: OllamaSettings;

    constructor(settins: OllamaSettings) {
        this.settings = settins;
        this.client = new Ollama({ host: this.settings.host });
    }

    async fetchModels(): Promise<string[]> {
        const response: ListResponse = await this.client.list();
        return response.models.map((model: ModelResponse) => model.name);
    }

    async *generate(prefix: string, suffix: string): AsyncGenerator<Suggestion> {
        console.log("fetching completion");

        const promiseIterator = await this.client.generate({
            model: this.settings.model,
            prompt: prefix,
            stream: true,
        });

        let completion = "";
        for await (let response of promiseIterator) {
            completion += response.response;
            yield { complete_suggestion: completion, display_suggestion: completion }
        }
    }

    async abort() {
        console.log("canceling completion");
        this.client.abort();
    }
}


