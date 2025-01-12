import { Provider, ProviderId } from "../provider";
import OllamaCompleter from "./completer";
import { OllamaSettings } from "./settings";

export class OllamaProvider implements Provider {
    id: ProviderId;
    name: string;
    description: string;
    settings: OllamaSettings;
    completer: OllamaCompleter;
    models: string[] = [];

    constructor(settings: OllamaSettings) {
        this.id = ProviderId.OLLAMA;
        this.name = "Ollama";
        this.description = "Ollama is a language model that can generate text based on a prompt.";
        this.settings = settings;

        this.loadCompleter();
        console.log("OllamaProvider created");
    }

    async loadCompleter(): Promise<void> {
        console.log("loading ollama completer");
        this.completer = new OllamaCompleter(this.settings);
        this.models = await this.completer.fetchModels();
    }
}