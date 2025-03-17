import { Menu, setIcon, setTooltip } from 'obsidian';
import Inscribe from '../main';
import { ProfileTracker } from 'src/profile/tracker';
import { CompletionEngine } from 'src/completion/engine';

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
        this.updateCompletionEnabledState();
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
            item.setTitle(`${completionEnabled ? 'Disable' : 'Enable'} completion globally`);
            item.onClick(() => {
                this.plugin.settings.completion_enabled = !completionEnabled;
                this.plugin.saveSettings();
                this.updateCompletionEnabledState();
            });
        });
        menu.addItem((item) => {
            const [path,] = this.profileTracker.getActiveProfileMapping();
            item.setTitle(`Disable for current path: ${path}`);
            item.onClick(() => {
                const mapping = this.plugin.settings.path_profile_mappings[path];
                mapping.enabled = false;
                this.plugin.saveSettings();
            });
        });

        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle("Open settings");
            item.onClick(() => {
                const setting = (this.plugin.app as any).setting;
                setting.open();
                setting.openTabById(this.plugin.manifest.id);
            })
        });

        menu.showAtMouseEvent(event);
    }

    private updateCompletionEnabledState(): void {
        if (this.plugin.settings.completion_enabled) {
            this.statusBarItem.removeClass('completion-disabled');
            setTooltip(this.statusBarItem, `Profile: ${this.profileTracker.getActiveProfile().name}`, { placement: 'top' });
        } else {
            this.statusBarItem.addClass('completion-disabled');
            setTooltip(this.statusBarItem, `Completion disabled`, { placement: 'top' });
        }
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
        if (this.plugin.settings.completion_enabled) {
            setTooltip(this.statusBarItem, `Profile: ${profile}`, { placement: 'top' });
        }
    }
} 