import { App, Editor } from "obsidian";
import { InlineCompletionOptions, Suggestion } from "src/extension";
import Inscribe from "src/main";
import { buildProviders, Provider, Providers, ProviderType } from "src/providers";
import { Settings, CompletionOptions, DEFAULT_PROFILE, Profile, Profiles } from "src/settings/settings";
import StatusBarItem from "src/statusbar/status-bar-item";

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

        yield* this.generateCompletion(activeEditor.editor, provider, options);
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

export class ProfileManager {
    private activeProfile: Profile;
    private app: App;
    private settings: Settings;
    private statusBarComponent: StatusBarItem;
    private inlineSuggestionOptions: InlineCompletionOptions = { delayMs: 300, splitStrategy: "sentence" };

    constructor(private plugin: Inscribe) {
        this.app = this.plugin.app;
        this.settings = this.plugin.settings;
        this.activeProfile = this.settings.profiles[this.resolveProfileFromPath(this.getActiveFilePath())];
        this.statusBarComponent = new StatusBarItem(this.plugin, this.activeProfile.name);
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

    getOptions(): InlineCompletionOptions {
        return this.inlineSuggestionOptions;
    }

    private getActiveFilePath(): string {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return "";
        if (!activeEditor.file) return "";
        return activeEditor.file.path;
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
}