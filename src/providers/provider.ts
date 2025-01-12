import { Completer } from "./completer";

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
    models: string[];
    loadCompleter: () => Promise<void>;
}