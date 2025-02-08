import { App, PluginSettingTab, Setting } from "obsidian";
import { TEMPLATE_VARIABLES } from "src/completion/prompt";
import { SplitStrategy } from "src/extension";
import Inscribe from "src/main";
import { ProviderId } from "src/providers";

export class InscribeSettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        containerEl.empty();

        await this.displayGeneralSettings();
        switch (this.plugin.profile.provider) {
            case ProviderId.OLLAMA:
                await this.displayOllamaSettings();
                break;
            case ProviderId.OPENAI:
                await this.displayOpenAISettings();
                break;
            default:
                break;
        }
    }

    async displayGeneralSettings(): Promise<void> {
        const { containerEl } = this;
        const settings = this.plugin.profile;

        containerEl.createEl("h1", { text: "General" });
        new Setting(containerEl)
            .setName("AI Provider")
            .setDesc("Choose your preferred AI provider.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(
                        Object.fromEntries(Object.entries(settings.providers).map(([key, value]) => [key, value.name]))
                    );
                dropdown
                    .setValue(this.plugin.profile.provider)
                    .onChange(async (value) => {
                        this.plugin.settings.profile = value;
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
                    .setPlaceholder(settings.delayMs.toString())
                    .setValue(settings.delayMs.toString())
                    .onChange(async (value) => {
                        settings.delayMs = parseInt(value);
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
                    .setValue(this.plugin.profile.splitStrategy)
                    .onChange(async (value) => {
                        this.plugin.profile.splitStrategy = value as SplitStrategy;
                        await this.plugin.saveSettings();
                    });
            });
    }

    async displayOllamaSettings(): Promise<void> {
        const { containerEl } = this;
        const settings = this.plugin.profile.providers.ollama;

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
                    settings.models = await this.plugin.completer.updateModels();
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
        const settings = this.plugin.profile.providers.openai;

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
