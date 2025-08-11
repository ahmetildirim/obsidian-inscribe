import { Editor } from "obsidian";
import { ProviderOptions } from "src/settings/settings";

export enum ProviderType {
    OLLAMA = "ollama",
    OPENAI = "openai",
    OPENAI_COMPATIBLE = "openai_compatible",
    GEMINI = "gemini",
}

// Completer interface for ai integrations
export interface Provider {
    settings: any
    generate: (editor: Editor, prompt: string, options: ProviderOptions) => AsyncGenerator<string>;
    abort: () => Promise<void>;
    fetchModels(): Promise<string[]> | string[];
    connectionTest(): Promise<boolean>;
}