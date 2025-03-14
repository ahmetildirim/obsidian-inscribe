import { App } from "obsidian";
import { InlineCompletionOptions } from "src/extension";
import Inscribe from "src/main";
import { DEFAULT_PROFILE, Profile, Settings } from "src/settings/settings";
import StatusBarItem from "src/statusbar/status-bar-item";

export class ProfileTracker {
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

    notifyGenerationStarted(): void {
        this.statusBarComponent.startGenerating();
    }

    notifyGenerationEnded(): void {
        this.statusBarComponent.stopGenerating(this.activeProfile.name);
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

        Object.entries(this.settings.path_profile_mappings).forEach(([path, mapping]) => {
            const normalizedMappingPath = path.replace(/^\/+|\/+$/g, '');
            if (normalizedPath.startsWith(normalizedMappingPath)) {
                if (normalizedMappingPath.length > longestMatch.length) {
                    longestMatch = normalizedMappingPath;
                    matchedProfile = mapping.profile;
                }
            }
        });

        return matchedProfile;
    }
}