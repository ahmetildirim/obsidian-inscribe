import { Ollama } from "ollama";
import { Suggestion } from "codemirror-companion-extension";
import { OllamaSettings } from "./settings";
import { Completer } from "..";
import { activeEditor } from "src/completion";

export default class OllamaCompleter implements Completer {
    client: Ollama
    settings: OllamaSettings;
    aborted: boolean = false;

    constructor(settins: OllamaSettings, client: Ollama) {
        this.settings = settins;
        this.client = client;
    }

    async *generate(prefix: string, suffix: string): AsyncGenerator<Suggestion> {
        this.aborted = false;
        const initialCursor = activeEditor.getCursor();

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
            const currentCursor = activeEditor.getCursor();
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
}


