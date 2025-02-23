import { App, Editor } from "obsidian";
import { InlineCompletionOptions, Suggestion } from "src/extension";
import Inscribe from "src/main";
import { buildProviders, Provider, Providers, ProviderType } from "src/providers";
import { Settings, CompletionOptions, DEFAULT_PROFILE, Profile } from "src/settings/settings";
import StatusBarItem from "src/statusbar/status-bar-item";

export class ProviderManager {
    private app: App;
    private settings: Settings;
    private providers: Providers;
    private activeProfile: Profile;
    private inlineSuggestionOptions: InlineCompletionOptions = { delayMs: 300, splitStrategy: "sentence" };
    private statusBarComponent: StatusBarItem;

    constructor(private plugin: Inscribe) {
        this.app = this.plugin.app;
        this.settings = this.plugin.settings;
        this.providers = buildProviders(this.settings);
        this.activeProfile = this.settings.profiles[this.resolveProfileFromPath(this.getActiveFilePath())];
        this.statusBarComponent = new StatusBarItem(this.plugin, this.activeProfile.name);
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
        const profileId = this.resolveProfileFromPath(filePath);
        this.activeProfile = this.settings.profiles[profileId];
        this.inlineSuggestionOptions = { delayMs: this.activeProfile.delayMs, splitStrategy: this.activeProfile.splitStrategy };
        this.statusBarComponent.update(this.activeProfile.name);
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

    private getActiveFilePath(): string {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return "";
        if (!activeEditor.file) return "";
        return activeEditor.file.path;
    }
} 