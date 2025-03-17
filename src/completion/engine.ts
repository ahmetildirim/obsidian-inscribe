import { App, Editor } from "obsidian";
import { ProfileTracker } from "src/profile/tracker";
import { ProviderFactory } from "src/providers/factory";
import { Suggestion } from "src/extension";
import { CompletionOptions, Settings } from "src/settings/settings";
import { Provider } from "src/providers/provider";

export class CompletionEngine {
    private app: App;
    private settings: Settings;
    private profileTracker: ProfileTracker;
    private providerFactory: ProviderFactory;
    private completionStatusListeners: ((isGenerating: boolean) => void)[] = [];

    constructor(
        app: App,
        settings: Settings,
        profileTracker: ProfileTracker,
        providerFactory: ProviderFactory,
    ) {
        this.app = app;
        this.settings = settings;
        this.profileTracker = profileTracker;
        this.providerFactory = providerFactory;
    }

    async *fetchCompletion(): AsyncGenerator<Suggestion> {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return;
        if (!activeEditor.editor) return;

        const [, profile] = this.profileTracker.getActiveProfileMapping();

        const provider = this.providerFactory.getProvider(profile.provider);
        const options = profile.completionOptions;

        this.notifyCompletionStatus(true);
        yield* this.complete(activeEditor.editor, provider, options);
        this.notifyCompletionStatus(false);
    }

    onCompletionStatusChange(listener: (isGenerating: boolean) => void) {
        this.completionStatusListeners.push(listener);
    }

    private notifyCompletionStatus(isGenerating: boolean) {
        for (const listener of this.completionStatusListeners) {
            listener(isGenerating);
        }
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
