import { App, Editor } from "obsidian";
import { ProfileService } from "src/profile/service";
import { ProviderFactory } from "src/providers/factory";
import { Suggestion } from "src/extension";
import { CompletionOptions, Settings } from "src/settings/settings";
import { Provider } from "src/providers/provider";
import preparePrompt from "src/completions/prompt";
import { isVimEnabled, isVimInsertMode } from "src/completions/vim";
import nlp from "compromise";

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

        // Check if the editor is in Vim insert mode
        if (isVimEnabled(activeEditor.editor)) {
            if (!isVimInsertMode(activeEditor.editor)) {
                return;
            }
        }

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
        // if (lastChar !== " ") return;

        const prompt = preparePrompt(activeEditor.editor, options.userPrompt);
        this.notifyCompletionStatus(true);
        yield* this.complete(activeEditor.editor, provider, prompt, options);
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

    private async *complete(editor: Editor, provider: Provider, prompt: string, options: CompletionOptions): AsyncGenerator<Suggestion> {
        for await (let text of provider.generate(editor, prompt, options)) {
            text = text.trim();

            if (options.outputLimit.enabled) {
                const sentences = nlp(text).sentences().out('array');
                if (sentences.length > options.outputLimit.sentences) {
                    // Take only the first N sentences
                    text = sentences.slice(0, options.outputLimit.sentences).join(' ');
                    yield { text: text };
                    break;
                }
            }

            yield { text: text };
        }
    }
}