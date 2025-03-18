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
