import { Menu, setIcon, setTooltip } from 'obsidian';
import Inscribe from '../main';
import { ProfileTracker } from 'src/profile/tracker';
import { CompletionEngine } from 'src/completion/engine';

export default class StatusBarItem {
    private plugin: Inscribe;
    private item: HTMLElement;

    private profileTracker: ProfileTracker;
    private completionEngine: CompletionEngine;

    constructor(plugin: Inscribe, profileTracker: ProfileTracker, completionEngine: CompletionEngine) {
        this.plugin = plugin;
        this.profileTracker = profileTracker;
        this.completionEngine = completionEngine;

        this.profileTracker.onProfileChange(this.handleProfileChange.bind(this));
        this.completionEngine.onCompletionStatusChange(this.handleCompletionStatusChange.bind(this));

        this.item = this.plugin.addStatusBarItem();
        setIcon(this.item, 'feather');
        this.item.addClasses(['status-bar-item-icon', `mod-clickable`]);

        this.updateProfile(this.profileTracker.getActiveProfile().name);
    }

    private showContextMenu(event: MouseEvent): void {
        const menu = new Menu();

        menu.addItem((item) => {
            item.setTitle("Item");
        });

        menu.showAtMouseEvent(event);
    }

    private handleCompletionStatusChange(isGenerating: boolean): void {
        if (isGenerating) {
            this.item.addClass('active');
            setTooltip(this.item, 'Generating...', { placement: 'top' });
        } else {
            this.item.removeClass('active');
            this.updateProfile(this.profileTracker.getActiveProfile().name);
        }
    }

    private handleProfileChange(profile: string): void {
        this.updateProfile(profile);
    }

    private updateProfile(profile: string): void {
        setTooltip(this.item, `Profile: ${profile}`, { placement: 'top' });
    }
} 