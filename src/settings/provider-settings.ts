import { Setting } from "obsidian";
import { ProviderId } from "../providers/provider";
import { InscribeSettingsComponent } from "./settings-component";
import { OllamaSettingsComponent } from "src/providers/ollama";
import { OpenAISettingsComponent } from "src/providers/openai";

export class ProviderSettingsComponent extends InscribeSettingsComponent {
    public display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl("h1", { text: "Provider Settings" });

        // Provider Selection
        new Setting(containerEl)
            .setName("AI Provider")
            .setDesc("Choose your preferred AI provider.")
            .addDropdown((dropdown) => {
                for (const provider of this.plugin.providers) {
                    dropdown.addOption(provider.id, provider.name);
                }
                dropdown
                    .setValue(this.plugin.settings.provider)
                    .onChange(async (value) => {
                        this.plugin.settings.provider = value
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        // switch case for providers
        switch (this.plugin.settings.provider) {
            case ProviderId.OPENAI:
                new OpenAISettingsComponent(this.plugin, containerEl).display();
                break;
            case ProviderId.OLLAMA:
                new OllamaSettingsComponent(this.plugin, containerEl).display();
                break;
        }
    }
}