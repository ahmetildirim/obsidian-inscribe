import { Integration } from "..";

export interface OllamaSettings {
    integration: Integration;
    name: string;
    description: string;
    host: string;
    model: string;
    models: string[];
}
