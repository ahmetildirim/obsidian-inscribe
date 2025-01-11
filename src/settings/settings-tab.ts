import { App, PluginSettingTab } from "obsidian";
import Inscribe from "../main";
import { ProviderSettingsComponent } from "./provider-settings";

export class InscribeSettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        new ProviderSettingsComponent(this.plugin, containerEl).display();
    }
}