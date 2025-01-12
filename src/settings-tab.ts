import { App, PluginSettingTab } from "obsidian";
import Inscribe from "./main";
import { ProviderSettingsComponent } from "./settings/provider-settings";

export class InscribeSettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        new ProviderSettingsComponent(this.plugin, containerEl).display();
    }
}