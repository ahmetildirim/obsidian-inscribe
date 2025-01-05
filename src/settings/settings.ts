import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import Inscribe from 'src/main';

export interface InscribeSettings {
    defaultProvider: string;
    openAI: {
        apiKey: string;
        model: string;
    };
    anthropic: {
        apiKey: string;
    };
    huggingFace: {
        accessToken: string;
    };
    custom: {
        apiEndpoint: string;
    };
}

export const DEFAULT_SETTINGS: InscribeSettings = {
    defaultProvider: "openai",
    openAI: {
        apiKey: "",
        model: "gpt-4",
    },
    anthropic: {
        apiKey: "",
    },
    huggingFace: {
        accessToken: "",
    },
    custom: {
        apiEndpoint: "",
    },
};


export class InscribeSettingTab extends PluginSettingTab {
    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl("h2", { text: "AI Integration Settings" });

        // Provider Selection
        new Setting(containerEl)
            .setName("Default AI Provider")
            .setDesc("Choose your preferred AI provider.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("openai", "OpenAI")
                    .addOption("anthropic", "Anthropic")
                    .addOption("huggingface", "Hugging Face")
                    .addOption("custom", "Custom")
                    .setValue(this.plugin.settings.defaultProvider)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultProvider = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh settings to load dynamic options
                    });
            });

        // Dynamic Provider Settings
        if (this.plugin.settings.defaultProvider === "openai") {
            this.openAISettings(containerEl);
        } else if (this.plugin.settings.defaultProvider === "anthropic") {
            this.anthropicSettings(containerEl);
        } else if (this.plugin.settings.defaultProvider === "huggingface") {
            this.huggingFaceSettings(containerEl);
        } else if (this.plugin.settings.defaultProvider === "custom") {
            this.customModelSettings(containerEl);
        }
    }

    openAISettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "OpenAI Settings" });
        new Setting(containerEl)
            .setName("API Key")
            .setDesc("Enter your OpenAI API Key.")
            .addText((text) =>
                text
                    .setPlaceholder("sk-...")
                    .setValue(this.plugin.settings.openAI.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.openAI.apiKey = value;
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
                    .setValue(this.plugin.settings.openAI.model)
                    .onChange(async (value) => {
                        this.plugin.settings.openAI.model = value;
                        await this.plugin.saveSettings();
                    });
            });
    }

    anthropicSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "Anthropic Settings" });
        new Setting(containerEl)
            .setName("API Key")
            .setDesc("Enter your Anthropic API Key.")
            .addText((text) =>
                text
                    .setPlaceholder("api-key")
                    .setValue(this.plugin.settings.anthropic.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropic.apiKey = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    huggingFaceSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "Hugging Face Settings" });
        new Setting(containerEl)
            .setName("Access Token")
            .setDesc("Enter your Hugging Face Access Token.")
            .addText((text) =>
                text
                    .setPlaceholder("hf_...")
                    .setValue(this.plugin.settings.huggingFace.accessToken)
                    .onChange(async (value) => {
                        this.plugin.settings.huggingFace.accessToken = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    customModelSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "Custom Model Settings" });
        new Setting(containerEl)
            .setName("API Endpoint")
            .setDesc("Enter the API endpoint for your custom model.")
            .addText((text) =>
                text
                    .setPlaceholder("https://api.example.com")
                    .setValue(this.plugin.settings.custom.apiEndpoint)
                    .onChange(async (value) => {
                        this.plugin.settings.custom.apiEndpoint = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}