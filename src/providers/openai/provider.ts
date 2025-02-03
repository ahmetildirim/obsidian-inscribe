import { Completer, Provider } from "..";
import { Editor } from "obsidian";
import { OpenAISettings } from ".";

export class OpenAICompleter implements Completer {
    integration: Provider = Provider.OPENAI;
    settings: OpenAISettings
    completer: Completer;
    models: string[];
    constructor(settings: OpenAISettings) {
        this.settings = settings;
    }
    generate: (editor: Editor) => AsyncGenerator<string>;
    abort: () => Promise<void>;
    availableModels(): string[] {
        return ["gpt-4", "davinci"];
    }
}