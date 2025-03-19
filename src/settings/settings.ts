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
export type Path = string;
export type PathConfig = { profile: ProfileName, enabled: boolean };
export interface Settings {
    enabled: boolean,
    // available providers
    providers: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    },
    // profiles
    profiles: Profiles,
    // path to profile mappings
    path_configs: Record<Path, PathConfig>,
}

export const DEFAULT_PROFILE: ProfileName = "default";
export const DEFAULT_PATH = "/";
export const DEFAULT_SETTINGS: Settings = {
    enabled: true,
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
    path_configs: {
        "/": {
            profile: DEFAULT_PROFILE,
            enabled: true,
        },
    },
};

// Create a new profile and return the id
export function newProfile(settings: Settings): string {
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

