import { OllamaSettings } from "src/providers/ollama";
import { OpenAISettings } from "src/providers/openai";
import { Provider } from "src/providers";
import { PluginSettingTab, App, Setting } from "obsidian";
import { TEMPLATE_VARIABLES } from "src/completion/prompt";
import Inscribe from "src/main";
import { SplitStrategy } from "src/extension";

export interface Profile {
    provider: string,
    providers: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    },
    delay_ms: number,
    splitStrategy: SplitStrategy
}

export type ProfileName = string;
export interface ProfileSettings {
    [profile: ProfileName]: Profile
}

export interface Settings {
    provider: string,
    providers: {
        ollama: OllamaSettings,
        openai: OpenAISettings,
    },
    delay_ms: number,
    splitStrategy: SplitStrategy
}

export const DEFAULT_SETTINGS: Settings = {
    provider: "ollama",
    providers: {
        openai: {
            integration: Provider.OPENAI,
            name: "Open AI",
            description: "Use OpenAI APIs to generate text.",
            apiKey: "",
            model: "gpt-4o",
            models: ["gpt-4", "gpt-3.5-turbo", "gpt-3.5", "gpt-3", "gpt-2", "gpt-1"],
        },
        ollama: {
            integration: Provider.OLLAMA,
            name: "Ollama",
            description: "Use your own Ollama instance to generate text.",
            host: "http://localhost:11434",
            model: "mistral-nemo",
            models: ["llama3.2:latest", "mistral-nemo"],
            user_prompt: 'Complete following text:\n {{pre_cursor}}}',
            system_prompt: "You are an helpful AI completer. Follow instructions",
            temperature: 0.5,
        },
    },
    delay_ms: 500,
    splitStrategy: "word",
}

export const DEFAULT_PROFILE: ProfileSettings = {
    "default": DEFAULT_SETTINGS,
    "ollama": DEFAULT_SETTINGS,
}

export class InscribeSettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        containerEl.empty();

        await this.displayGeneralSettings();
        switch (this.plugin.settings.provider) {
            case Provider.OLLAMA:
                await this.displayOllamaSettings();
                break;
            case Provider.OPENAI:
                await this.displayOpenAISettings();
                break;
            default:
                break;
        }
    }

    async displayGeneralSettings(): Promise<void> {
        const { containerEl } = this;
        const settings = this.plugin.settings;

        containerEl.createEl("h1", { text: "General" });
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
                        this.plugin.settings.provider = value;
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });
        new Setting(containerEl)
            .setName("Delay (ms)")
            .setDesc("Set the delay in milliseconds before fetching suggestions.")
            .addText((text) => {
                text.inputEl.setAttrs({ type: "number", min: "0" });
                text
                    .setPlaceholder(settings.delay_ms.toString())
                    .setValue(settings.delay_ms.toString())
                    .onChange(async (value) => {
                        settings.delay_ms = parseInt(value);
                        await this.plugin.saveSettings();
                    })
            });

        new Setting(containerEl)
            .setName("Accept Strategy")
            .setDesc("Choose the accept strategy.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions({
                        "word": "Word",
                        "sentence": "Sentence",
                        "paragraph": "Paragraph",
                        "full": "Full",
                    });
                dropdown
                    .setValue(this.plugin.settings.splitStrategy)
                    .onChange(async (value) => {
                        this.plugin.settings.splitStrategy = value as SplitStrategy;
                        await this.plugin.saveSettings();
                    });
            });
    }

    async displayOllamaSettings(): Promise<void> {
        const { containerEl } = this;
        const settings = this.plugin.settings.providers.ollama;

        containerEl.createEl("h3", { text: "Ollama Settings" });

        new Setting(containerEl)
            .setName("Host")
            .setDesc("Enter the Ollama host.")
            .addText((text) => text
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
                    settings.models = await this.plugin.completer.availableModels();
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
                    });
            });
        new Setting(containerEl)
            .setName("User Prompt")
            .setDesc("Enter the user prompt.")
            .addExtraButton((button) => {
                button.setTooltip("Insert variables").onClick(() => {
                    settings.user_prompt = `${settings.user_prompt}\n${TEMPLATE_VARIABLES}`;
                    this.display();
                });
            })
            .addTextArea((text) => {
                text.inputEl.setAttr("rows", "5");
                text.inputEl.setCssStyles({ width: "100%", resize: "vertical", position: "relative" });
                text
                    .setPlaceholder(settings.user_prompt)
                    .setValue(settings.user_prompt)
                    .onChange(async (value) => {
                        settings.user_prompt = value;
                        await this.plugin.saveSettings();
                    });
            }
            );
        new Setting(containerEl)
            .setName("System Prompt")
            .setDesc("Enter the system prompt.")
            .addTextArea((text) => {
                text.inputEl.setAttr("rows", "2");
                text.inputEl.setCssStyles({ width: "100%", resize: "vertical", position: "relative" });
                text
                    .setPlaceholder(settings.system_prompt)
                    .setValue(settings.system_prompt)
                    .onChange(async (value) => {
                        settings.system_prompt = value;
                        await this.plugin.saveSettings();
                    });
            });
        new Setting(containerEl)
            .setName("Temperature")
            .setDesc("Set the temperature.")
            .addSlider((slider) => {
                slider
                    .setLimits(0, 1, 0.01)
                    .setValue(settings.temperature)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        settings.temperature = value;
                        await this.plugin.saveSettings();
                    });
            });
    }

    async displayOpenAISettings(): Promise<void> {
        const { containerEl } = this;
        const settings = this.plugin.settings.providers.openai;

        containerEl.createEl("h3", { text: "OpenAI Settings" });

        new Setting(containerEl)
            .setName("API Key")
            .setDesc("Enter the OpenAI API key.")
            .addText((text) => text
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

