import { ProviderType } from "..";

export interface OpenAICompatibleSettings {
    integration: ProviderType;
    name: string;
    description: string;
    baseUrl: string;
    // ID of the API key in Obsidian's secret storage
    apiKeySecret: string;
    models: string[];
    configured: boolean;
    temperature_range: { min: number; max: number };
    extraParams: Record<string, unknown>;
}