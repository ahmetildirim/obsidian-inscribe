export interface Settings {
    provider: ProviderType,
    providerSettings: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    }
}

export enum ProviderType {
    OLLAMA = "ollama",
    OPENAI = "openai",
}

export const DEFAULT_SETTINGS: Settings = {
    provider: ProviderType.OLLAMA,
    providerSettings: {
        openai: {
            apiKey: "",
            model: "gpt-4"
        },
        ollama: {
            host: "http://localhost:11434",
            model: "mistral-nemo"
        },
    }
}

export interface OllamaSettings {
    host: string;
    model: string;
}

export interface OpenAISettings {
    apiKey: string;
    model: string;
}


