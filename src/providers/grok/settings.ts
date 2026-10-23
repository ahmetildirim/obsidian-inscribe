import { ProviderType } from "..";

export interface GrokSettings {
    integration: ProviderType;
    name: string;
    description: string;
    // ID of the API key in Obsidian's secret storage
    apiKeySecret: string;
    models: string[];
    configured: boolean;
    temperature_range: { min: number; max: number };
}
