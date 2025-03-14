import { App, Editor } from "obsidian";
import { Suggestion } from "src/extension";
import Inscribe from "src/main";
import { ProfileManager } from "src/profile/manager";
import { buildProviders, Provider, Providers, ProviderType } from "src/providers";
import { Settings, CompletionOptions, DEFAULT_PROFILE, Profile, Profiles } from "src/settings/settings";

export class ProviderManager {
    private app: App;
    private settings: Settings;
    private providers: Providers;

    constructor(private plugin: Inscribe, private profileManager: ProfileManager) {
        this.app = this.plugin.app;
        this.settings = this.plugin.settings;
        this.providers = buildProviders(this.settings);
    }

    async * fetchSuggestions(): AsyncGenerator<Suggestion> {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return;
        if (!activeEditor.editor) return;

        const provider = this.providers[this.profileManager.getActiveProfile().provider];
        const options = this.profileManager.getActiveProfile().completionOptions;

        // Signal generation start
        this.profileManager.notifyGenerationStarted();
        yield* this.generateCompletion(activeEditor.editor, provider, options);
        // Signal generation end, regardless of success or failure
        this.profileManager.notifyGenerationEnded();
    }

    loadProviders() {
        this.providers = buildProviders(this.settings);
    }

    private async * generateCompletion(editor: Editor, provider: Provider, options: CompletionOptions): AsyncGenerator<Suggestion> {
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

    async updateModels(provider: ProviderType): Promise<string[]> {
        return this.providers[provider].updateModels();
    }
}