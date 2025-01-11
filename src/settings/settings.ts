import { OllamaSettings } from "src/providers/ollama";
import { OpenAISettings } from "src/providers/openai/settings";

export interface Settings {
    provider: string,
    providerSettings: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    },
    promtty: boolean,
}

export const DEFAULT_SETTINGS: Settings = {
    provider: "ollama",
    providerSettings: {
        openai: {
            apiKey: "",
            model: "gpt-4"
        },
        ollama: {
            host: "http://localhost:11434",
            model: "mistral-nemo"
        },
    },
    promtty: true,
}


