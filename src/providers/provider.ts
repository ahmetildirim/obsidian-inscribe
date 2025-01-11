import { Suggestion } from "codemirror-companion-extension";


export interface Provider {
    id: ProviderId;
    description: string;
    generate: (prefix: string, suffix: string) => AsyncGenerator<Suggestion>;
    load: () => Promise<void>;
    abort: () => void;
}

export enum ProviderId {
    OLLAMA = "ollama",
    OPENAI = "openai",
}

// List of providers with their display name and description
export const PROVIDERS = [
    {
        id: ProviderId.OLLAMA,
        name: "Ollama",
    },
    {
        id: ProviderId.OPENAI,
        name: "Open AI",
    },
]

export interface ProviderInfo {
    id: ProviderId;
    name: string;
    description: string;
    getModels: () => Promise<string[]>;
}