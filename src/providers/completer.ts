import { Suggestion } from "codemirror-companion-extension";
import { Provider } from ".";
import { Editor } from "obsidian";

// Completer interface for ai integrations
export interface Completer {
    integration: Provider;
    settings: any
    generate: (editor: Editor, refix: string, suffix: string) => AsyncGenerator<Suggestion>;
    abort: () => void;
    availableModels(): Promise<string[]> | string[];
}