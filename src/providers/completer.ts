import { Suggestion } from "codemirror-companion-extension";

// Completer interface for ai integrations
export interface Completer {
    generate: (prefix: string, suffix: string) => AsyncGenerator<Suggestion>;
    abort: () => void;
}

export abstract class CompleterProvider {
    abstract loadCompleter(): Completer;
    abstract get integration(): string;
}
