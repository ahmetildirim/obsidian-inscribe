import { Settings } from "src/settings/settings";
import { Provider } from "./provider";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai/provider";

export * from "./provider";
export * from "./completer";

export enum Integration {
    OLLAMA = "ollama",
    OPENAI = "openai",
}

// builder function for providers
export const buildProviders = (settings: Settings): Provider[] => {
    return [
        new OllamaProvider(settings.providerSettings.ollama),
        new OpenAIProvider(settings.providerSettings.openai),
    ];
}

// builder function for provider
export const createProvider = (settings: Settings): Provider => {
    switch (settings.provider) {
        case Integration.OLLAMA:
            return new OllamaProvider(settings.providerSettings.ollama);
        case Integration.OPENAI:
            return new OpenAIProvider(settings.providerSettings.openai);
        default:
            throw new Error("Invalid provider");
    }
}

