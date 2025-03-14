import { App, Editor } from "obsidian";
import { ProfileTracker } from "src/profile/tracker";
import { ProviderFactory } from "src/providers/factory";
import { Suggestion } from "src/extension";
import { CompletionOptions } from "src/settings/settings";
import { Provider } from "src/providers/provider";
export class CompletionEngine {
    constructor(
        private readonly app: App,
        private readonly profileTracker: ProfileTracker,
        private readonly providerFactory: ProviderFactory,
    ) { }

    async *fetchCompletion(): AsyncGenerator<Suggestion> {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return;
        if (!activeEditor.editor) return;

        const provider = this.providerFactory.getProvider(this.profileTracker.getActiveProfile().provider);
        const options = this.profileTracker.getActiveProfile().completionOptions;

        // Signal generation start
        this.profileTracker.notifyGenerationStarted();
        yield* this.complete(activeEditor.editor, provider, options);
        this.profileTracker.notifyGenerationEnded();
    }

    private async *complete(editor: Editor, provider: Provider, options: CompletionOptions): AsyncGenerator<Suggestion> {
        await provider.abort();

        const cursor = editor.getCursor();
        const currentLine = editor.getLine(cursor.line);

        if (!currentLine.length) return;

        const lastChar = currentLine[cursor.ch - 1];
        if (lastChar !== " ") return;

        for await (const text of provider.generate(editor, options)) {
            yield { text };
        }
    }
}
