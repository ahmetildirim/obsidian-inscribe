import { Editor } from "obsidian";
import { CompletionOptions } from "src/settings";

// Completer interface for ai integrations
export interface Provider {
    settings: any
    generate: (editor: Editor, options: CompletionOptions) => AsyncGenerator<string>;
    abort: () => Promise<void>;
    updateModels(): Promise<string[]> | string[];
}