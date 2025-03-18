import { App, Editor } from "obsidian";
import { ProfileService } from "src/profile/service";
import { ProviderFactory } from "src/providers/factory";
import { Suggestion } from "src/extension";
import { CompletionOptions, Settings } from "src/settings/settings";
import { Provider } from "src/providers/provider";

export default class CompletionService {
    private app: App;
    private settings: Settings;
    private profileService: ProfileService;
    private providerFactory: ProviderFactory;
    private completionStatusListeners: ((isGenerating: boolean) => void)[] = [];

    constructor(
        app: App,
        settings: Settings,
        profileService: ProfileService,
        providerFactory: ProviderFactory,
    ) {
        this.app = app;
        this.settings = settings;
        this.profileService = profileService;
        this.providerFactory = providerFactory;
    }

    async *fetchCompletion(): AsyncGenerator<Suggestion> {
        if (!this.completionEnabled()) return;
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return;
        if (!activeEditor.editor) return;

        const profile = this.profileService.getActiveProfile();

        const provider = this.providerFactory.getProvider(profile.provider);
        const options = profile.completionOptions;

        this.notifyCompletionStatus(true);
        yield* this.complete(activeEditor.editor, provider, options);
        this.notifyCompletionStatus(false);
    }

    onCompletionStatusChange(listener: (isGenerating: boolean) => void) {
        this.completionStatusListeners.push(listener);
    }

    completionEnabled(): boolean {
        return this.settings.enabled && this.profileService.getActivePathConfig().enabled;
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
