import { App, PluginSettingTab, Setting } from "obsidian";
import { OllamaSettings } from "src/providers/ollama";
import Inscribe from "src/main";
import { OpenAISettings } from "src/providers/openai";
import { Integration } from "src/providers";

export interface Settings {
    provider: string,
    providers: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    },
    promtty: boolean,
}

export const DEFAULT_SETTINGS: Settings = {
    provider: "ollama",
    providers: {
        openai: {
            integration: Integration.OPENAI,
            name: "Open AI",
            description: "OpenAI is an artificial intelligence research laboratory consisting of the for-profit OpenAI LP and the non-profit OpenAI Inc.",
            apiKey: "",
            model: "gpt-4",
            models: ["gpt-4", "gpt-3.5-turbo", "gpt-3.5", "gpt-3", "gpt-2", "gpt-1"],
        },
        ollama: {
            integration: Integration.OLLAMA,
            name: "Ollama",
            description: "Ollama is an AI provider that offers a variety of models for different use cases.",
            host: "http://localhost:11434",
            model: "mistral-nemo",
            models: ["llama3.2:latest", "mistral-nemo"],
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

        // AI PROVIDER SELECTOR
        containerEl.createEl("h1", { text: "Provider Settings" });

        new Setting(containerEl)
            .setName("AI Provider")
            .setDesc("Choose your preferred AI provider.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(
                        Object.fromEntries(Object.entries(this.plugin.settings.providers).map(([key, value]) => [key, value.name]))
                    );
                dropdown
                    .setValue(this.plugin.settings.provider)
                    .onChange(async (value) => {
                        this.plugin.settings.provider = value
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        switch (this.plugin.settings.provider) {
            case Integration.OLLAMA:
                await this.displayOllamaSettings();
                break;
            case Integration.OPENAI:
                await this.displayOpenAISettings();
                break;
            default:
                break;
        }
    }

    async displayOllamaSettings(): Promise<void> {
        const { containerEl } = this;
        const settings = this.plugin.settings.providers.ollama;

        containerEl.createEl("h3", { text: "Ollama Settings" });

        new Setting(containerEl)
            .setName("Host")
            .setDesc("Enter the Ollama host.")
            .addText((text) =>
                text
                    .setPlaceholder(settings.host)
                    .setValue(settings.host)
                    .onChange(async (value) => {
                        settings.host = value;
                        await this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Model")
            .setDesc("Choose the Ollama model.")
            .addExtraButton((button) => {
                button.setTooltip("Refresh model list").onClick(async () => {
                    settings.models = await this.plugin.provider.availableModels();
                    await this.plugin.saveSettings();
                    this.display();
                });
            })
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(Object.fromEntries(settings.models.map(model => [model, model])))
                    .setValue(settings.model)
                    .onChange(async (value) => {
                        settings.model = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })
            });
    }

    async displayOpenAISettings(): Promise<void> {
        const { containerEl } = this;
        const settings = this.plugin.settings.providers.openai;

        containerEl.createEl("h3", { text: "OpenAI Settings" });

        new Setting(containerEl)
            .setName("API Key")
            .setDesc("Enter the OpenAI API key.")
            .addText((text) =>
                text
                    .setPlaceholder(settings.apiKey)
                    .setValue(settings.apiKey)
                    .onChange(async (value) => {
                        settings.apiKey = value;
                        await this.plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Model")
            .setDesc("Choose the OpenAI model.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(Object.fromEntries(settings.models.map(model => [model, model])))
                    .setValue(settings.model)
                    .onChange(async (value) => {
                        settings.model = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}


