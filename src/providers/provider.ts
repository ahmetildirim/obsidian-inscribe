import { Suggestion } from "codemirror-companion-extension";

// Completer interface for ai integrations
export interface Completer {
    generate: (prefix: string, suffix: string) => AsyncGenerator<Suggestion>;
    load: () => Promise<void>;
    abort: () => void;
}

export enum ProviderId {
    OLLAMA = "ollama",
    OPENAI = "openai",
}

// Provider interface for ai providers
export interface Provider {
    id: ProviderId;
    name: string;
    description: string;
    getModels: () => Promise<string[]>;
    getSettingsComponent: (plugin: any, containerEl: HTMLElement) => void;
    getCompleter: (settings: any) => Completer;
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