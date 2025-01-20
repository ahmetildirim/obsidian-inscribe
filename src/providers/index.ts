import { Settings } from "src/settings/settings";
import { OpenAICompleter } from "./openai/provider";
import { Completer } from "./completer";
import OllamaCompleter from "./ollama/completer";

export * from "./completer";

export enum Provider {
    OLLAMA = "ollama",
    OPENAI = "openai",
}

// builder function for provider
export const buildCompleter = (settings: Settings): Completer => {
    switch (settings.provider) {
        case Provider.OLLAMA:
            return new OllamaCompleter(settings.providers.ollama);
        case Provider.OPENAI:
            return new OpenAICompleter(settings.providers.openai);
        default:
            throw new Error("Invalid provider");
    }
}

