import { Provider } from "..";

export interface OpenAISettings {
    integration: Provider;
    name: string;
    description: string;
    apiKey: string;
    model: string;
    models: string[];
}