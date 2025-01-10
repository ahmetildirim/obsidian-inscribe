import { Setting } from "obsidian";
import { PROVIDERS } from "../providers/provider";
import { InscribeSettings } from "./inscribe-settings";

export class ProviderSettings extends InscribeSettings {
    public display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl("h1", { text: "Provider Settings" });

        // Provider Selection
        new Setting(containerEl)
            .setName("AI Provider")
            .setDesc("Choose your preferred AI provider.")
            .addDropdown((dropdown) => {
                for (const provider of PROVIDERS) {
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
            case "openai":
                this.openAISettings(containerEl);
                break;
            case "ollama":
                this.ollamaSettings(containerEl);
                break;
        }
    }

    openAISettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "OpenAI Settings" });

        // create a box 
        new Setting(containerEl)
            .setName("API Key")
            .setDesc("Enter your OpenAI API Key.")
            .addText((text) =>
                text
                    .setPlaceholder("sk-...")
                    .setValue(this.plugin.settings.providerSettings.openai.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.providerSettings.openai.apiKey = value;
                        await this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Model")
            .setDesc("Choose the OpenAI model.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("gpt-4", "GPT-4")
                    .addOption("gpt-3.5", "GPT-3.5")
                    .setValue(this.plugin.settings.providerSettings.openai.model)
                    .onChange(async (value) => {
                        this.plugin.settings.providerSettings.openai.model = value;
                        await this.plugin.saveSettings();
                    });
            });
    }

    ollamaSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "Ollama Settings" });

        new Setting(containerEl)
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
        new Setting(containerEl)
            .setName("Model")
            .setDesc("Choose the Ollama model.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("mistral-nemo", "Mistral-Nemo")
                    .addOption("mistral-gpt", "Mistral-GPT")
                    .setValue(this.plugin.settings.providerSettings.ollama.model)
                    .onChange(async (value) => {
                        this.plugin.settings.providerSettings.ollama.model = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}