import { Provider } from "..";

export interface OllamaSettings {
    integration: Provider;
    name: string;
    description: string;
    host: string;
    model: string;
    models: string[];
    prompt: string;
    system_prompt: string;
}
