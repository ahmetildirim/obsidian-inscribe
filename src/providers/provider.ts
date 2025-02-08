import { Editor } from "obsidian";

// Completer interface for ai integrations
export interface Provider {
    settings: any
    generate: (editor: Editor) => AsyncGenerator<string>;
    abort: () => Promise<void>;
    updateModels(): Promise<string[]> | string[];
}