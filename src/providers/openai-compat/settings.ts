import { ProviderType } from "..";

export interface OpenAICompatibleSettings {
    integration: ProviderType;
    name: string;
    description: string;
    baseUrl: string;
    apiKey: string;
    models: string[];
    configured: boolean;
    temperature_range: { min: number; max: number };
}