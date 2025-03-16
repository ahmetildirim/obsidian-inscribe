import { setIcon, setTooltip } from 'obsidian';
import Inscribe from '../main';
import { ProfileTracker } from 'src/profile/tracker';

export default class StatusBarItem {
    plugin: Inscribe;
    statusBarItem: HTMLElement;

    private profileTracker: ProfileTracker;

    private isGenerating: boolean = false;
    private spinnerEl: HTMLElement | null = null;

    constructor(plugin: Inscribe, profileTracker: ProfileTracker) {
        this.plugin = plugin;
        this.statusBarItem = this.plugin.addStatusBarItem();
        this.profileTracker = profileTracker;
        setIcon(this.statusBarItem, 'feather');
        this.update(this.profileTracker.getActiveProfile().name);

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

        this.profileTracker.onProfileChange((profile) => {
            this.update(profile.name);
        });
    }

    update(profile: string) {
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

    stopGenerating(profile: string) {
        this.isGenerating = false;

        // Remove spinner
        if (this.spinnerEl) {
            this.spinnerEl.remove();
            this.spinnerEl = null;
        }

        // Reset icon and tooltip
        this.statusBarItem.empty();
        setIcon(this.statusBarItem, 'feather');
        this.update(profile);
    }
} 