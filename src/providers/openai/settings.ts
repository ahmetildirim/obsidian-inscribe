import { Integration } from "..";

export interface OpenAISettings {
    integration: Integration;
    name: string;
    description: string;
    apiKey: string;
    model: string;
    models: string[];
}