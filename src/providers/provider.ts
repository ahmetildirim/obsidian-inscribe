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
    settings: any
    completer: Completer;
    getModels: () => Promise<string[]>;
    reloadCompleter: () => Promise<void>;
}