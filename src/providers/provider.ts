import { Suggestion } from "codemirror-companion-extension";


export interface Provider {
    name: string;
    description: string;
    generate: (prefix: string, suffix: string) => AsyncGenerator<Suggestion>;
    load: () => Promise<void>;
    abort: () => void;
}

export enum ProviderType {
    OLLAMA = "ollama",
    OPENAI = "openai",
}

// List of providers with their display name and description
export const PROVIDERS = [
    {
        id: ProviderType.OLLAMA,
        name: "Ollama",
        description: "Ollama model for completion",
    },
    {
        id: ProviderType.OPENAI,
        name: "OpenAI",
        description: "OpenAI model for completion",
    },
]