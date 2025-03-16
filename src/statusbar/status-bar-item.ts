import { Menu, setIcon, setTooltip } from 'obsidian';
import Inscribe from '../main';
import { ProfileTracker } from 'src/profile/tracker';
import { CompletionEngine } from 'src/completion/engine';
import { findProfileMapping } from 'src/settings/settings';

export default class StatusBarItem {
    private plugin: Inscribe;
    private statusBarItem: HTMLElement;
    private profileTracker: ProfileTracker;
    private completionEngine: CompletionEngine;

    constructor(plugin: Inscribe, profileTracker: ProfileTracker, completionEngine: CompletionEngine) {
        this.plugin = plugin;
        this.profileTracker = profileTracker;
        this.completionEngine = completionEngine;

        this.profileTracker.onProfileChange(this.handleProfileChange.bind(this));
        this.completionEngine.onCompletionStatusChange(this.handleCompletionStatusChange.bind(this));

        this.statusBarItem = this.createStatusBarItem();
        this.updateProfile(this.profileTracker.getActiveProfile().name);
    }

    private createStatusBarItem(): HTMLElement {
        const item = this.plugin.addStatusBarItem();
        setIcon(item, 'feather');
        item.addClasses(['status-bar-item-icon', `mod-clickable`]);
        item.addEventListener('click', this.showContextMenu.bind(this));
        return item;
    }

    private showContextMenu(event: MouseEvent): void {
        const menu = new Menu();
        const completionEnabled = this.plugin.settings.completion_enabled;

        menu.addItem((item) => {
            item.setTitle(completionEnabled ? 'Disable completion' : 'Enable completion');
            item.setIcon('toggle-on');
            item.onClick(() => {
                this.plugin.settings.completion_enabled = !completionEnabled;
                this.plugin.saveSettings();
            });
        });
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle("Open settings");
            item.setIcon('gear');
            item.onClick(() => {
            })
        });

        menu.showAtMouseEvent(event);
    }

    private handleCompletionStatusChange(isGenerating: boolean): void {
        if (isGenerating) {
            this.statusBarItem.addClass('active');
            setTooltip(this.statusBarItem, 'Generating...', { placement: 'top' });
        } else {
            this.statusBarItem.removeClass('active');
            this.updateProfile(this.profileTracker.getActiveProfile().name);
        }
    }

    private handleProfileChange(profile: string): void {
        this.updateProfile(profile);
    }

    private updateProfile(profile: string): void {
        setTooltip(this.statusBarItem, `Profile: ${profile}`, { placement: 'top' });
    }
} 