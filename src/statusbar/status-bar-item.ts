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

        // Add CSS for smooth animation
        const style = document.createElement('style');
        style.id = 'inscribe-spinner-style';
        style.textContent = `
            @keyframes inscribe-write {
                0% { transform: translateX(-4px) rotate(-8deg); }
                25% { transform: translateX(0px) rotate(0deg); }
                50% { transform: translateX(4px) rotate(8deg); }
                75% { transform: translateX(0px) rotate(0deg); }
                100% { transform: translateX(-4px) rotate(-8deg); }
            }
            .inscribe-writing {
                animation: inscribe-write 0.5s ease-in-out infinite;
                display: inline-block;
            }
        `;
        document.head.appendChild(style);

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