import { ProviderType } from "..";

export interface GeminiSettings {
    integration: ProviderType;
    name: string;
    description: string;
    apiKey: string;
    models: string[];
    configured: boolean;
}
