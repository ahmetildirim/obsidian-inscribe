import { Provider } from "./provider";
import { Ollama } from "ollama";
import { Suggestion } from "codemirror-companion-extension";
import { OllamaSettings } from "../settings/settings";

export default class OllamaProvider implements Provider {
    id = "ollama";
    name = "Ollama";
    description = "Ollama model for completion";
    ollama: Ollama
    settings: OllamaSettings;

    constructor(settins: OllamaSettings) {
        this.settings = settins;
        this.ollama = new Ollama({ host: this.settings.host });
    }

    async load() {
        console.log("Loading Ollama model");
        this.ollama = new Ollama({ host: this.settings.host });
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


