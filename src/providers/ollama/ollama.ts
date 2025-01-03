import { Model } from "../../model";
import { Ollama } from "ollama";
import { Suggestion } from "codemirror-companion-extension";
import { Settings } from "./settings";

export default class OllamaModel implements Model {
    id = "ollama";
    name = "Ollama";
    description = "Ollama model for completion";
    ollama: Ollama
    settings: Settings;

    constructor() {
        this.settings = new Settings();
    }
    
    async load() {
        console.log("Loading Ollama model");
        this.ollama = new Ollama({ host: this.settings.host });
    }

    async *generate(prefix: string, suffix: string) : AsyncGenerator<Suggestion> {
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

        
    