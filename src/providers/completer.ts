import { Suggestion } from "codemirror-companion-extension";
import { Provider } from ".";

// Completer interface for ai integrations
export interface Completer {
    integration: Provider;
    settings: any
    generate: (prefix: string, suffix: string) => AsyncGenerator<Suggestion>;
    abort: () => void;
    availableModels(): Promise<string[]> | string[];
}