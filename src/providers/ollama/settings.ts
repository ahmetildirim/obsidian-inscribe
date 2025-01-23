import { Provider } from "..";

export interface OllamaSettings {
    integration: Provider;
    name: string;
    description: string;
    host: string;
    model: string;
    models: string[];
    user_prompt: string;
    system_prompt: string;
}
