import { ProviderType } from "..";

export interface OpenAISettings {
    integration: ProviderType;
    name: string;
    description: string;
    apiKey: string;
    model: string;
    models: string[];
    configured: boolean;
}