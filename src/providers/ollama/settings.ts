import { ProviderType } from "..";

export interface OllamaSettings {
    integration: ProviderType;
    name: string;
    description: string;
    host: string;
    model: string;
    models: string[];
    user_prompt: string;
    system_prompt: string;
    temperature: number;
}
