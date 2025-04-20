import { Editor } from "obsidian";
import { CompletionOptions } from "src/settings/settings";

export enum ProviderType {
    OLLAMA = "ollama",
    OPENAI = "openai",
    OPENAI_COMPATIBLE = "openai_compatible",
    GEMINI = "gemini",
}

// Completer interface for ai integrations
export interface Provider {
    settings: any
    generate: (editor: Editor, prompt: string, options: CompletionOptions) => AsyncGenerator<string>;
    abort: () => Promise<void>;
    fetchModels(): Promise<string[]> | string[];
    connectionTest(): Promise<boolean>;
}