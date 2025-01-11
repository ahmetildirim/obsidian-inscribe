import { Completer } from "../provider";
import { ModelResponse, Ollama } from "ollama";
import { Suggestion } from "codemirror-companion-extension";
import { OllamaSettings } from "./settings";

export default class OllamaCompleter implements Completer {
    ollama: Ollama
    settings: OllamaSettings;

    constructor(settins: OllamaSettings) {
        this.settings = settins;
        this.ollama = new Ollama({ host: this.settings.host });
    }

    async load() {
        console.log(`loading ollama ${this.settings.host} provider`);
        this.ollama = new Ollama({ host: this.settings.host });
    }

    async fetchModels(): Promise<string[]> {
        const models = await this.ollama.list();
        return models.models.map((model: ModelResponse) => model.name);
    }

    async *generate(prefix: string, suffix: string): AsyncGenerator<Suggestion> {
        console.log("fetching completion");

        const promiseIterator = await this.ollama.generate({
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
        this.ollama.abort();
    }
}


