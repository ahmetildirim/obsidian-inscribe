import { ProviderType } from "..";

export interface GrokSettings {
    integration: ProviderType;
    name: string;
    description: string;
    apiKey: string;
    models: string[];
    configured: boolean;
    temperature_range: { min: number; max: number };
}
