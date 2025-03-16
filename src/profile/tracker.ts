import { App } from "obsidian";
import { InlineCompletionOptions } from "src/extension";
import Inscribe from "src/main";
import { DEFAULT_PROFILE, Profile, Settings } from "src/settings/settings";

// ProfileTracker class is responsible for tracking the active profile based on the current file path.
export class ProfileTracker {
    private plugin: Inscribe;
    private activeProfile: Profile;
    private app: App;
    private settings: Settings;
    private inlineSuggestionOptions: InlineCompletionOptions = { delayMs: 300, splitStrategy: "sentence" };
    private profileChangeCallbacks: ((profile: Profile) => void)[] = [];

    constructor(plugin: Inscribe) {
        this.plugin = plugin;
        this.app = this.plugin.app;
        this.settings = this.plugin.settings;
        this.activeProfile = this.settings.profiles[this.resolveProfileFromPath(this.getActiveFilePath())];

        this.app.workspace.on('file-open', (file) => {
            if (!file) return;
            this.update(file.path);
        });
    }

    getActiveProfile(): Profile {
        return this.activeProfile;
    }

    getOptions(): InlineCompletionOptions {
        return this.inlineSuggestionOptions;
    }

    onProfileChange(callback: (profile: Profile) => void) {
        this.profileChangeCallbacks.push(callback);
    }

    private update(filePath: string) {
        const profileId = this.resolveProfileFromPath(filePath);
        this.activeProfile = this.settings.profiles[profileId];
        this.inlineSuggestionOptions = { delayMs: this.activeProfile.delayMs, splitStrategy: this.activeProfile.splitStrategy };
        this.profileChangeCallbacks.forEach(cb => cb(this.activeProfile));
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

    onunload() {
        this.app.workspace.off('file-open', this.update);
    }
}