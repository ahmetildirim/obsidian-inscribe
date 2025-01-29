import { Provider } from ".";
import { Editor } from "obsidian";

// Completer interface for ai integrations
export interface Completer {
    integration: Provider;
    settings: any
    generate: (editor: Editor) => AsyncGenerator<string>;
    abort: () => void;
    availableModels(): Promise<string[]> | string[];
}