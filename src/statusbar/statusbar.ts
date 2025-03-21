import { Menu, setIcon, setTooltip } from 'obsidian';
import Inscribe from '../main';
import { ProfileService } from 'src/profile/service';
import CompletionService from 'src/completions/service';
import { findPathConfig } from 'src/settings';

export default class StatusBarItem {
    private plugin: Inscribe;
    private statusBarItem: HTMLElement;
    private profileService: ProfileService;
    private completionService: CompletionService;
    private isGenerating: boolean = false;

    constructor(plugin: Inscribe, profileTracker: ProfileService, completionService: CompletionService) {
        this.plugin = plugin;
        this.profileService = profileTracker;
        this.completionService = completionService;

        this.profileService.onProfileChange(this.handleProfileChange.bind(this));
        this.completionService.onCompletionStatusChange(this.handleCompletionStatusChange.bind(this));

        this.statusBarItem = this.createStatusBarItem();
        this.render();
    }

    private createStatusBarItem(): HTMLElement {
        const item = this.plugin.addStatusBarItem();
        setIcon(item, 'feather');
        item.addClasses(['status-bar-item-icon', `mod-clickable`]);
        item.addEventListener('click', this.displayContextMenu.bind(this));
        return item;
    }

    private displayContextMenu(event: MouseEvent): void {
        const menu = new Menu();
        const globalCompletionEnabled = this.plugin.settings.enabled;
        const pathCompletionEnabled = this.profileService.getActivePathConfig().enabled;
        const path = this.profileService.getActivePath();
        const profile = this.profileService.getActiveProfile();

        menu.addItem((item) => {
            item.setTitle(`Profile: ${profile.name}`).setIsLabel(true);
        });
        menu.addItem((item) => {
            item.setTitle(`${pathCompletionEnabled ? 'Disable' : 'Enable'} this path: {${path}]}`)
                .setChecked(pathCompletionEnabled)
                .onClick(() => {
                    const pathConfig = findPathConfig(this.plugin.settings, path);
                    pathConfig.enabled = !pathCompletionEnabled;
                    this.plugin.saveSettings();
                    this.render();
                });
        });
        menu.addItem((item) => {
            item.setTitle(`${globalCompletionEnabled ? 'Disable' : 'Enable'} globally`)
                .setChecked(globalCompletionEnabled)
                .onClick(() => {
                    this.plugin.settings.enabled = !globalCompletionEnabled;
                    this.plugin.saveSettings();
                    this.render();
                });
        });
        menu.addSeparator();
        menu.addItem((item) => {
            item.setTitle("Open settings")
                .onClick(() => {
                    const setting = (this.plugin.app as any).setting;
                    setting.open();
                    setting.openTabById(this.plugin.manifest.id);
                })
        });

        menu.showAtMouseEvent(event);
    }

    private handleCompletionStatusChange(isGenerating: boolean): void {
        this.isGenerating = isGenerating;
        this.render();
    }

    private handleProfileChange(profile: string): void {
        this.render();
    }

    private updateProfile(profile: string): void {
        setTooltip(this.statusBarItem, `Profile: ${profile}`, { placement: 'top' });
    }

    private render(): void {
        if (this.isGenerating) {
            this.statusBarItem.addClass('active');
            setTooltip(this.statusBarItem, 'Inscribing...', { placement: 'top' });
        } else {
            this.statusBarItem.removeClass('active');
            if (this.completionService.completionEnabled()) {
                this.statusBarItem.removeClass('completion-disabled');
                this.updateProfile(this.profileService.getActiveProfile().name);
            } else {
                this.statusBarItem.addClass('completion-disabled');
                setTooltip(this.statusBarItem, `Completion disabled`, { placement: 'top' });
            }
        }
    }
} 