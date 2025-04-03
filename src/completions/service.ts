import { App, Editor } from "obsidian";
import { ProfileService } from "src/profile/service";
import { ProviderFactory } from "src/providers/factory";
import { Suggestion } from "src/extension";
import { CompletionOptions, Settings } from "src/settings/settings";
import { Provider } from "src/providers/provider";
import preparePrompt from "src/completions/prompt";

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
        this.notifyCompletionStatus(false);
        if (!this.completionEnabled()) return;

        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return;
        if (!activeEditor.editor) return;

        const profile = this.profileService.getActiveProfile();
        const provider = this.providerFactory.getProvider(profile.provider);
        const options = profile.completionOptions;

        // Stop any previous generation
        await provider.abort();

        const cursor = activeEditor.editor.getCursor();
        const currentLine = activeEditor.editor.getLine(cursor.line);

        // Check if the current line is empty
        if (!currentLine.length) return;

        const lastChar = currentLine[cursor.ch - 1];
        // Check if the last character is not a space
        if (lastChar !== " ") return;

        const prompt = preparePrompt(activeEditor.editor, options.userPrompt);
        yield* this.complete(activeEditor.editor, provider, prompt, options);
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

    private async *complete(editor: Editor, provider: Provider, prompt: string, options: CompletionOptions): AsyncGenerator<Suggestion> {
        this.notifyCompletionStatus(true);
        for await (const text of provider.generate(editor, prompt, options)) {
            // trim the text to remove any leading or trailing whitespace
            yield { text: text.trim() };
        }
        this.notifyCompletionStatus(false);
    }
}
