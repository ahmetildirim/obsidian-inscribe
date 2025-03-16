import { setIcon, setTooltip } from 'obsidian';
import Inscribe from '../main';
import { ProfileTracker } from 'src/profile/tracker';
import { CompletionEngine } from 'src/completion/engine';

export default class StatusBarItem {
    private plugin: Inscribe;
    private statusBarItem: HTMLElement;

    private profileTracker: ProfileTracker;
    private completionEngine: CompletionEngine;

    private isGenerating: boolean = false;
    private spinnerEl: HTMLElement | null = null;

    constructor(plugin: Inscribe, profileTracker: ProfileTracker, completionEngine: CompletionEngine) {
        this.plugin = plugin;
        this.statusBarItem = this.plugin.addStatusBarItem();
        this.profileTracker = profileTracker;
        this.completionEngine = completionEngine;

        this.profileTracker.onProfileChange(this.handleProfileChange.bind(this));
        this.completionEngine.onCompletionStatusChange(this.handleCompletionStatusChange.bind(this));

        setIcon(this.statusBarItem, 'feather');
        this.updateProfile(this.profileTracker.getActiveProfile().name);
    }

    private handleCompletionStatusChange(isGenerating: boolean): void {
        if (isGenerating) {
            this.startGenerating();
        } else {
            this.stopGenerating();
            this.updateProfile(this.profileTracker.getActiveProfile().name);
        }
    }

    private handleProfileChange(profile: string): void {
        this.updateProfile(profile);
    }

    private updateProfile(profile: string): void {
        if (!this.isGenerating) {
            setIcon(this.statusBarItem, 'feather');
        }
        setTooltip(this.statusBarItem, `Profile: ${profile}`, { placement: 'top' });
    }

    startGenerating() {
        this.isGenerating = true;

        // Remove old spinner if exists
        if (this.spinnerEl) {
            this.spinnerEl.remove();
            this.spinnerEl = null;
        }

        // Clear the status bar item
        this.statusBarItem.empty();

        // Create a writing animation with feather icon only
        this.spinnerEl = this.statusBarItem.createDiv({ cls: 'inscribe-writing' });
        setIcon(this.spinnerEl, 'feather');
        setTooltip(this.statusBarItem, 'Generating...', { placement: 'top' });
    }

    stopGenerating() {
        this.isGenerating = false;

        // Remove spinner
        if (this.spinnerEl) {
            this.spinnerEl.remove();
            this.spinnerEl = null;
        }

        // Reset icon and tooltip
        this.statusBarItem.empty();
        setIcon(this.statusBarItem, 'feather');
    }
} 