import { ProviderType } from "src/providers";
import { SplitStrategy } from "src/extension";
import { OllamaSettings } from "src/providers/ollama";
import { OpenAISettings } from "src/providers/openai";
import { OpenAICompatibleSettings } from "src/providers/openai-compat";

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
    completionOptions: CompletionOptions,
    delayMs: number,
    splitStrategy: SplitStrategy
}

export type ProfileId = string;
export type Profiles = Record<ProfileId, Profile>
export type Path = string;
export type PathConfig = { profile: ProfileId, enabled: boolean };
export interface Settings {
    enabled: boolean,
    // available providers
    providers: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
        openai_compatible: OpenAICompatibleSettings,
    },
    // profiles
    profiles: Profiles,
    // path to profile mappings
    path_configs: Record<Path, PathConfig>,
}

export const DEFAULT_PROFILE: ProfileId = "default";
export const DEFAULT_PATH = "/";
export const DEFAULT_SETTINGS: Settings = {
    enabled: false,
    providers: {
        openai: {
            integration: ProviderType.OPENAI,
            name: "Open AI",
            description: "Use OpenAI APIs to generate text.",
            apiKey: "api-key",
            model: "gpt-4o-mini",
            models: ["gpt-4o", "gpt-4o-mini"],
            configured: false,
        },
        ollama: {
            integration: ProviderType.OLLAMA,
            name: "Ollama",
            description: "Use your own Ollama instance to generate text.",
            host: "http://localhost:11434",
            models: ["llama3.2:latest", "mistral-nemo"],
            configured: false,
        },
        openai_compatible: {
            integration: ProviderType.OPENAI_COMPATIBLE,
            name: "OpenAI Compatible",
            description: "Use OpenAI compatible APIs to generate completions.",
            apiKey: "api-key",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4o-mini",
            models: ["gpt-4o", "gpt-4o-mini"],
            configured: false,
        },
    },
    profiles: {
        default: {
            name: "Default Profile",
            provider: ProviderType.OLLAMA,
            delayMs: 500,
            splitStrategy: "sentence",
            completionOptions: {
                model: "gemma3:12b",
                userPrompt: 'If the last sentence is incomplete, only complete the sentence and nothing else. If the last sentence is complete, generate a new sentence that follows logically:\n---\n{{pre_cursor}}',
                systemPrompt: "You are a writing assistant that predicts and completes sentences in a natural, context-aware manner. Your goal is to continue the user’s text smoothly, maintaining coherence, fluency, and style. Adapt to the user’s writing tone, whether formal, informal, creative, or technical. Ensure that completions feel intuitive, useful, and free of unnecessary repetition. Do not generate completion that includes the prompt itself.",
                temperature: 0.5,
            }
        },
    },
    path_configs: {
        "/": {
            profile: DEFAULT_PROFILE,
            enabled: true,
        },
    },
};

// Create a new profile and return the id
export function createProfile(settings: Settings): string {
    const profiles = settings.profiles;
    const id = Math.random().toString(36).substring(2, 6);

    // generate a new profile name
    let name = "New Profile";
    // loop through the profiles to make sure the name is unique
    let i = 1;
    Object.entries(profiles).forEach(([, value]) => {
        if (value.name === name) {
            name = `New Profile ${i}`;
            i++;
        }
    });

    // copy the default profile
    const defaultProfile = profiles[DEFAULT_PROFILE];
    const profile = {
        ...defaultProfile,
        name: name,
    };

    // add the new profile
    profiles[id] = profile;

    return id;
}

export function findPathConfig(settings: Settings, path: string): PathConfig {
    return settings.path_configs[path] || settings.path_configs[DEFAULT_PATH];
}

export function createPathConfig(settings: Settings, path: string, profile: ProfileId): void {
    path = path || DEFAULT_PATH;
    settings.path_configs[path] = { profile: profile, enabled: true };
}

export function resetSettings(settings: Settings): void {
    Object.assign(settings, DEFAULT_SETTINGS);
}