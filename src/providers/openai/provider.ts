import Inscribe from "src/main";
import { Completer, Provider } from "..";
import { Setting } from "obsidian";
import { OpenAISettings } from ".";
import { Suggestion } from "codemirror-companion-extension";

export class OpenAICompleter implements Completer {
    integration: Provider = Provider.OPENAI;
    name: string = "Open AI";
    description: "OpenAI the evilest company in the world";
    settings: OpenAISettings
    completer: Completer;
    models: string[];
    constructor(settings: OpenAISettings) {
        this.settings = settings;
    }
    generate: (prefix: string, suffix: string) => AsyncGenerator<Suggestion>;
    abort: () => void;
    availableModels(): string[] {
        return ["gpt-4", "davinci"];
    }
}