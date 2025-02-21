import { setIcon, setTooltip } from 'obsidian';
import Inscribe from '../main';

export default class StatusBarItem {
    plugin: Inscribe;
    statusBarItem: HTMLElement;

    constructor(plugin: Inscribe) {
        this.plugin = plugin;
        this.statusBarItem = this.plugin.addStatusBarItem();
        setIcon(this.statusBarItem, 'feather');
        setTooltip(this.statusBarItem, `Profile: ${this.plugin.providerManager.getActiveProfile().name}`, { placement: 'top' });
    }

    update() {
        setTooltip(this.statusBarItem, `Profile: ${this.plugin.providerManager.getActiveProfile().name}`, { placement: 'top' });
    }
} 