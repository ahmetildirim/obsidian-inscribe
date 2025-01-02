import { Model } from "../../model";
import { Ollama } from "ollama";
import { Suggestion } from "codemirror-companion-extension";

export default class OllamaModel implements Model {
    id = "ollama";
    name = "Ollama";
    description = "Ollama model for completion";
    ollama: Ollama;
    
    async load() {
        console.log("Loading Ollama model");
        this.ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
    }

    async *generate(prefix: string, suffix: string) : AsyncGenerator<Suggestion> {
        console.log("fetching completion");

        const promiseIterator = await this.ollama.generate({
			model: 'mistral-nemo',
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

        
    