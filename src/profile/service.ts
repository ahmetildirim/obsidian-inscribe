import { App } from "obsidian";
import { InlineCompletionOptions } from "src/extension";
import Inscribe from "src/main";
import { DEFAULT_PATH, DEFAULT_PROFILE, findPathConfig, PathConfig, Profile, Settings } from "src/settings/settings";

// ProfileService class is responsible for tracking the active profile based on the current file path.
export class ProfileService {
    private plugin: Inscribe;
    private activeProfile: Profile;
    private activePath: string;
    private app: App;
    private settings: Settings;
    private profileChangeCallbacks: ((profile: Profile) => void)[] = [];

    constructor(plugin: Inscribe) {
        this.plugin = plugin;
        this.app = this.plugin.app;
        this.settings = this.plugin.settings;
        this.update(this.getActiveFilePath());

        // Add listener for file open events
        this.plugin.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                if (!file) return;
                this.update(file.path);
            })
        );

        // Add listener for file rename events
        this.plugin.registerEvent(
            this.app.vault.on('rename', (file) => {
                this.update(file.path);
            })
        );
    }

    getActiveProfile(): Profile {
        return this.activeProfile;
    }

    getActivePath(): string {
        return this.activePath;
    }

    getActivePathConfig(): PathConfig {
        return findPathConfig(this.settings, this.activePath);
    }

    getOptions(): InlineCompletionOptions {
        return {
            delayMs: this.activeProfile.delayMs,
            splitStrategy: this.activeProfile.splitStrategy
        };
    }

    onProfileChange(callback: (profile: Profile) => void) {
        this.profileChangeCallbacks.push(callback);
    }

    private update(filePath: string) {
        [this.activePath, this.activeProfile] = this.resolveProfileFromPath(filePath);
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
}