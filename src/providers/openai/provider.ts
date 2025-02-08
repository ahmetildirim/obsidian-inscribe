import { Provider } from "..";
import { Editor } from "obsidian";
import { OpenAISettings } from ".";

export class OpenAIProvider implements Provider {
    settings: OpenAISettings
    models: string[];
    constructor(settings: OpenAISettings) {
        this.settings = settings;
    }
    generate: (editor: Editor) => AsyncGenerator<string>;
    abort: () => Promise<void>;
    updateModels(): string[] {
        return ["gpt-4", "davinci"];
    }
}