import { ProviderType } from "src/providers";
import { SplitStrategy } from "src/extension";
import { OllamaSettings } from "src/providers/ollama";
import { OpenAISettings } from "src/providers/openai";

// Completion options for a profile
export interface CompletionOptions {
    model: string,
    userPrompt: string,
    systemPrompt: string,
    temperature: number
}

// Profile settings
export interface Profile {
    name: string,
    provider: ProviderType,
    delayMs: number,
    splitStrategy: SplitStrategy
    completionOptions: CompletionOptions,
}

export type ProfileName = string;
export type Profiles = Record<ProfileName, Profile>
export type ProfilePath = string;
export type AssignedProfile = { profile: ProfileName, enabled: boolean };
export interface Settings {
    // available providers
    providers: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    },
    // profiles
    profiles: Profiles,
    // path to profile mappings
    path_profile_mappings: Record<ProfilePath, AssignedProfile>,
}

export const DEFAULT_PROFILE: ProfileName = "default";
export const DEFAULT_PATH = "/";
export const DEFAULT_SETTINGS: Settings = {
    providers: {
        openai: {
            integration: ProviderType.OPENAI,
            name: "Open AI",
            description: "Use OpenAI APIs to generate text.",
            apiKey: "",
            model: "gpt-4o",
            models: ["gpt-4", "gpt-3.5-turbo", "gpt-3.5", "gpt-3", "gpt-2", "gpt-1"],
            configured: false,
        },
        ollama: {
            integration: ProviderType.OLLAMA,
            name: "Ollama",
            description: "Use your own Ollama instance to generate text.",
            host: "http://localhost:11434",
            models: ["llama3.2:latest", "mistral-nemo"],
            configured: true,
        },
    },
    profiles: {
        default: {
            name: "Default Profile",
            provider: ProviderType.OLLAMA,
            delayMs: 500,
            splitStrategy: "word",
            completionOptions: {
                model: "mistral-nemo",
                userPrompt: 'Complete following text:\n {{pre_cursor}}}',
                systemPrompt: "You are an helpful AI completer. Follow instructions",
                temperature: 0.5,
            }
        },
    },
    path_profile_mappings: {
        "/": {
            profile: DEFAULT_PROFILE,
            enabled: true,
        },
    },
};

