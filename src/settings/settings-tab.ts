import { App, PluginSettingTab } from "obsidian";
import Inscribe from "../main";
import { ProviderSettings } from "./provider-settings";

export class InscribeSettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        new ProviderSettings(this.plugin, containerEl).display();
    }
}