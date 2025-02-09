import { ProviderType } from "..";

export interface OllamaSettings {
    integration: ProviderType;
    name: string;
    description: string;
    host: string;
    models: string[];
    configured: boolean;
}
