import { Provider } from "src/providers";
import { SplitStrategy } from "src/extension";
import { OllamaSettings } from "src/providers/ollama";
import { OpenAISettings } from "src/providers/openai";

export interface Profile {
    provider: string,
    providers: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    },
    delay_ms: number,
    splitStrategy: SplitStrategy
}

export type ProfileName = string;

export type Profiles = Record<ProfileName, Profile>

export interface Settings {
    // active profile
    profile: ProfileName,
    // profiles
    profiles: Profiles,
}

export const DEFAULT_PROFILE: ProfileName = "default";
export const DEFAULT_SETTINGS: Settings = {
    profile: DEFAULT_PROFILE,
    profiles: {
        default: {
            provider: "ollama",
            providers: {
                openai: {
                    integration: Provider.OPENAI,
                    name: "Open AI",
                    description: "Use OpenAI APIs to generate text.",
                    apiKey: "",
                    model: "gpt-4o",
                    models: ["gpt-4", "gpt-3.5-turbo", "gpt-3.5", "gpt-3", "gpt-2", "gpt-1"],
                },
                ollama: {
                    integration: Provider.OLLAMA,
                    name: "Ollama",
                    description: "Use your own Ollama instance to generate text.",
                    host: "http://localhost:11434",
                    model: "mistral-nemo",
                    models: ["llama3.2:latest", "mistral-nemo"],
                    user_prompt: 'Complete following text:\n {{pre_cursor}}}',
                    system_prompt: "You are an helpful AI completer. Follow instructions",
                    temperature: 0.5,
                },
            },
            delay_ms: 500,
            splitStrategy: "word",
        },
    },
};

export * from "./tab";

