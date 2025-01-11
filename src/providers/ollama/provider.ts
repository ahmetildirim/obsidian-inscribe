import { Provider, ProviderId } from "../provider";
import OllamaCompleter from "./completer";
import { OllamaSettings } from "./settings";

export class OllamaProvider implements Provider {
    id: ProviderId;
    name: string;
    description: string;
    settings: OllamaSettings;
    completer: OllamaCompleter;

    constructor(settings: OllamaSettings) {
        this.id = ProviderId.OLLAMA;
        this.name = "Ollama";
        this.description = "Ollama is a language model that can generate text based on a prompt.";
        this.settings = settings;

        console.log("OllamaProvider created");
        this.completer = new OllamaCompleter(settings);
    }

    async getModels(): Promise<string[]> {
        return await this.completer.fetchModels();
    }

    async reloadCompleter(): Promise<void> {
        console.log("reloading ollama completer");
        this.completer = new OllamaCompleter(this.settings);
        await this.completer.load();
    }
}