import { App, PluginSettingTab, Setting } from "obsidian";
import { OllamaSettings } from "src/providers/ollama";
import Inscribe from "src/main";
import { OpenAISettings } from "src/providers/openai";

export interface Settings {
    provider: string,
    providerSettings: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    },
    promtty: boolean,
}

export const DEFAULT_SETTINGS: Settings = {
    provider: "ollama",
    providerSettings: {
        openai: {
            apiKey: "",
            model: "gpt-4"
        },
        ollama: {
            host: "http://localhost:11434",
            model: "mistral-nemo",
            models: ["llama3.2:latest"],
        },
    },
    promtty: true,
}

export class InscribeSettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl("h1", { text: "Provider Settings" });

        // AI Provider Selection
        new Setting(containerEl)
            .setName("AI Provider")
            .setDesc("Choose your preferred AI provider.")
            .addDropdown((dropdown) => {
                dropdown.addOptions(
                    Object.fromEntries(
                        this.plugin.providers.map((provider) => [provider.integration, provider.name])
                    )
                );

                dropdown
                    .setValue(this.plugin.settings.provider)
                    .onChange(async (value) => {
                        this.plugin.settings.provider = value
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        this.plugin.provider.displaySettings(this.plugin, containerEl);
    }
}


