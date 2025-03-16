import { App, Editor } from "obsidian";
import { ProfileTracker } from "src/profile/tracker";
import { ProviderFactory } from "src/providers/factory";
import { Suggestion } from "src/extension";
import { CompletionOptions } from "src/settings/settings";
import { Provider } from "src/providers/provider";

export class CompletionEngine {
    private app: App;
    private profileTracker: ProfileTracker;
    private providerFactory: ProviderFactory;

    constructor(
        app: App,
        profileTracker: ProfileTracker,
        providerFactory: ProviderFactory,
    ) {
        this.app = app;
        this.profileTracker = profileTracker;
        this.providerFactory = providerFactory;
    }

    async *fetchCompletion(): AsyncGenerator<Suggestion> {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return;
        if (!activeEditor.editor) return;

        const provider = this.providerFactory.getProvider(this.profileTracker.getActiveProfile().provider);
        const options = this.profileTracker.getActiveProfile().completionOptions;

        // Signal generation start
        yield* this.complete(activeEditor.editor, provider, options);
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
