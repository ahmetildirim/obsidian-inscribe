import { ProviderId } from "..";

export interface OllamaSettings {
    integration: ProviderId;
    name: string;
    description: string;
    host: string;
    model: string;
    models: string[];
    user_prompt: string;
    system_prompt: string;
    temperature: number;
}
