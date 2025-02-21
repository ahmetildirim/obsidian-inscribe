import { App, Editor } from "obsidian";
import { InlineCompletionOptions, Suggestion } from "src/extension";
import { buildProviders, Provider, Providers, ProviderType } from "src/providers";
import { Settings, CompletionOptions, DEFAULT_PROFILE, Profile } from "src/settings/settings";

export class ProviderManager {
    private app: App;
    private settings: Settings;
    private providers: Providers;
    private activeProfile: Profile;
    private inlineSuggestionOptions: InlineCompletionOptions = { delayMs: 300, splitStrategy: "sentence" };

    constructor(app: App, settings: Settings) {
        this.app = app;
        this.settings = settings;
        this.providers = buildProviders(settings);
        this.activeProfile = settings.profiles[DEFAULT_PROFILE];
    }

    async * fetchSuggestions(): AsyncGenerator<Suggestion> {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return;
        if (!activeEditor.editor) return;

        const provider = this.providers[this.activeProfile.provider];

        yield* this.generateCompletion(activeEditor.editor, provider, this.activeProfile.completionOptions);
    }

    getOptions(): InlineCompletionOptions {
        return this.inlineSuggestionOptions;
    }

    loadProviders() {
        this.providers = buildProviders(this.settings);
    }

    updateProfile(filePath: string) {
        const profileName = this.resolveProfileFromPath(filePath);
        this.activeProfile = this.settings.profiles[profileName];
        this.inlineSuggestionOptions = { delayMs: this.activeProfile.delayMs, splitStrategy: this.activeProfile.splitStrategy };
    }

    getActiveProfile(): Profile {
        return this.activeProfile;
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

    private resolveProfileFromPath(filePath: string): string {
        if (!this.settings.path_profile_mappings || Object.keys(this.settings.path_profile_mappings).length === 0) {
            return DEFAULT_PROFILE;
        }

        const normalizedPath = filePath.replace(/^\/+|\/+$/g, '');
        let longestMatch = '';
        let matchedProfile = DEFAULT_PROFILE;

        Object.entries(this.settings.path_profile_mappings).forEach(([path, profile]) => {
            const normalizedMappingPath = path.replace(/^\/+|\/+$/g, '');
            if (normalizedPath.startsWith(normalizedMappingPath)) {
                if (normalizedMappingPath.length > longestMatch.length) {
                    longestMatch = normalizedMappingPath;
                    matchedProfile = profile;
                }
            }
        });

        return matchedProfile;
    }

    async updateModels(provider: ProviderType): Promise<string[]> {
        return this.providers[provider].updateModels();
    }
} 