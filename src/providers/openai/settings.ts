import { Setting } from "obsidian";
import { InscribeSettingsComponent } from "src/settings/settings-component";

export interface OpenAISettings {
    apiKey: string;
    model: string;
}

export class OpenAISettingsComponent extends InscribeSettingsComponent {
    public display() {
        this.containerEl.createEl("h3", { text: "OpenAI Settings" });

        new Setting(this.containerEl)
            .setName("API Key")
            .setDesc("Enter the OpenAI API key.")
            .addText((text) =>
                text
                    .setPlaceholder(this.plugin.settings.providerSettings.openai.apiKey)
                    .setValue(this.plugin.settings.providerSettings.openai.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.providerSettings.openai.apiKey = value;
                        await this.plugin.saveSettings();
                    })
            );
        new Setting(this.containerEl)
            .setName("Model")
            .setDesc("Choose the OpenAI model.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("gpt-4", "GPT-4")
                    .addOption("davinci", "Davinci")
                    .setValue(this.plugin.settings.providerSettings.openai.model)
                    .onChange(async (value) => {
                        this.plugin.settings.providerSettings.openai.model = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}
