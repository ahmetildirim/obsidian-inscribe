import { ProviderId } from "..";

export interface OpenAISettings {
    integration: ProviderId;
    name: string;
    description: string;
    apiKey: string;
    model: string;
    models: string[];
}