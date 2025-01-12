import { Setting } from "obsidian";
import { InscribeSettingsComponent } from "src/settings/settings-component";

export interface OllamaSettings {
    host: string;
    model: string;
}

export class OllamaSettingsComponent extends InscribeSettingsComponent {
    public display() {
        this.containerEl.createEl("h3", { text: "Ollama Settings" });

        new Setting(this.containerEl)
            .setName("Host")
            .setDesc("Enter the Ollama host.")
            .addText((text) =>
                text
                    .setPlaceholder(this.plugin.settings.providerSettings.ollama.host)
                    .setValue(this.plugin.settings.providerSettings.ollama.host)
                    .onChange(async (value) => {
                        this.plugin.settings.providerSettings.ollama.host = value;
                        await this.plugin.saveSettings();
                    })
            );
        new Setting(this.containerEl)
            .setName("Model")
            .setDesc("Choose the Ollama model.")
            .addDropdown((dropdown) => {
                this.plugin.provider.models.forEach((model) => {
                    dropdown.addOption(model, model);
                });
                dropdown
                    .setValue(this.plugin.settings.providerSettings.ollama.model)
                    .onChange(async (value) => {
                        this.plugin.settings.providerSettings.ollama.model = value;
                        await this.plugin.saveSettings();
                    })
            });
    }
}
