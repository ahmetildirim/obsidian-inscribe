import { ProviderType } from "..";

export interface OllamaSettings {
    integration: ProviderType;
    name: string;
    description: string;
    host: string;
    models: string[];
    configured: boolean;
    temperature_range: { min: number, max: number };
}
