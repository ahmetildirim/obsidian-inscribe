import { Settings } from "src/settings";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";

export * from "./provider";

export enum ProviderType {
    OLLAMA = "ollama",
    OPENAI = "openai",
}

export interface Providers {
    [ProviderType.OLLAMA]: OllamaProvider,
    [ProviderType.OPENAI]: OpenAIProvider,
}

export const buildProviders = (settings: Settings): Providers => {
    return {
        [ProviderType.OLLAMA]: new OllamaProvider(settings.providers.ollama),
        [ProviderType.OPENAI]: new OpenAIProvider(settings.providers.openai),
    }
}
