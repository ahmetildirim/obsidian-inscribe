import { App, Editor } from "obsidian";
import { InlineCompletionOptions, Suggestion } from "src/extension";
import { buildProviders, Provider, Providers, ProviderType } from "src/providers";
import { Settings, CompletionOptions, DEFAULT_PROFILE, Profile } from "src/settings/settings";

export class ProviderManager {
    private app: App;
    private settings: Settings;
    private providers: Providers;
    private inlineSuggestionOptions: InlineCompletionOptions = { delayMs: 300, splitStrategy: "sentence" };

    constructor(app: App, settings: Settings) {
        this.app = app;
        this.settings = settings;
        this.providers = buildProviders(settings);
    }

    async * fetchSuggestions(): AsyncGenerator<Suggestion> {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return;
        if (!activeEditor.editor) return;

        const filePath = activeEditor.file?.path || '';

        const [provider, profile] = this.resolveProfile(filePath);

        this.inlineSuggestionOptions = { delayMs: profile.delayMs, splitStrategy: profile.splitStrategy };

        yield* this.generateCompletion(activeEditor.editor, provider, profile.completionOptions);
    }

    getOptions(): InlineCompletionOptions {
        return this.inlineSuggestionOptions;
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

    private resolveProfile(filePath: string): [Provider, Profile] {
        const profileName = this.resolveProfileFromPath(filePath);
        const profile = this.settings.profiles[profileName];
        const provider = this.providers[profile.provider];
        return [provider, profile];
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