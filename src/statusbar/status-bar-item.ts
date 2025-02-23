import { setIcon, setTooltip } from 'obsidian';
import Inscribe from '../main';

export default class StatusBarItem {
    plugin: Inscribe;
    statusBarItem: HTMLElement;

    constructor(plugin: Inscribe, profile: string) {
        this.plugin = plugin;
        this.statusBarItem = this.plugin.addStatusBarItem();
        setIcon(this.statusBarItem, 'feather');
        this.update(profile);
    }

    update(profile: string) {
        setTooltip(this.statusBarItem, `Profile: ${profile}`, { placement: 'top' });
    }
} 