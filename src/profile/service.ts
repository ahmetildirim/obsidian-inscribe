import { App } from "obsidian";
import { InlineCompletionOptions } from "src/extension";
import Inscribe from "src/main";
import { DEFAULT_PATH, DEFAULT_PROFILE, Profile, Settings } from "src/settings/settings";

// ProfileService class is responsible for tracking the active profile based on the current file path.
export class ProfileService {
    private plugin: Inscribe;
    private activeProfile: Profile;
    private activePathMapping: string;
    private app: App;
    private settings: Settings;
    private inlineSuggestionOptions: InlineCompletionOptions = { delayMs: 300, splitStrategy: "sentence" };
    private profileChangeCallbacks: ((profile: Profile) => void)[] = [];

    constructor(plugin: Inscribe) {
        this.plugin = plugin;
        this.app = this.plugin.app;
        this.settings = this.plugin.settings;
        this.update(this.getActiveFilePath());

        this.app.workspace.on('file-open', (file) => {
            if (!file) return;
            this.update(file.path);
        });
    }

    getActiveProfileMapping(): [string, Profile] {
        return [this.activePathMapping, this.activeProfile];
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
        [this.activePathMapping, this.activeProfile] = this.resolveProfileFromPath(filePath);

        this.inlineSuggestionOptions = { delayMs: this.activeProfile.delayMs, splitStrategy: this.activeProfile.splitStrategy };
        this.profileChangeCallbacks.forEach(cb => cb(this.activeProfile));
    }

    private getActiveFilePath(): string {
        const activeEditor = this.app.workspace.activeEditor;
        if (!activeEditor) return "";
        if (!activeEditor.file) return "";
        return activeEditor.file.path;
    }

    private resolveProfileFromPath(filePath: string): [string, Profile] {
        if (!this.settings.path_configs || Object.keys(this.settings.path_configs).length === 0) {
            return [DEFAULT_PATH, this.settings.profiles[DEFAULT_PROFILE]];
        }

        const normalizedPath = filePath.replace(/^\/+|\/+$/g, '');
        let longestMatch = '';
        let matchedProfile = DEFAULT_PROFILE;
        let pathMapping = '/';

        Object.entries(this.settings.path_configs).forEach(([path, mapping]) => {
            const normalizedMappingPath = path.replace(/^\/+|\/+$/g, '');
            if (normalizedPath.startsWith(normalizedMappingPath)) {
                if (normalizedMappingPath.length > longestMatch.length) {
                    longestMatch = normalizedMappingPath;
                    matchedProfile = mapping.profile;
                    pathMapping = path;
                }
            }
        });

        return [pathMapping, this.settings.profiles[matchedProfile]];
    }

    onunload() {
        this.app.workspace.off('file-open', this.update);
    }
}