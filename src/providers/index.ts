import { Settings } from "src/settings";
import { OpenAICompleter } from "./openai/provider";
import { Provider } from "./provider";
import OllamaProvider from "./ollama/provider";

export * from "./provider";

export enum ProviderId {
    OLLAMA = "ollama",
    OPENAI = "openai",
}

// builder function for provider
export const buildCompleter = (settings: Settings): Provider => {
    switch (settings.profiles.default.provider) {
        case ProviderId.OLLAMA:
            return new OllamaProvider(settings.providers.ollama);
        case ProviderId.OPENAI:
            return new OpenAICompleter(settings.providers.openai);
        default:
            throw new Error("Invalid provider");
    }
}

