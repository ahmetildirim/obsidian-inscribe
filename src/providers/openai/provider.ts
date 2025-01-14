import Inscribe from "src/main";
import { Completer, Integration, Provider } from "..";
import { Setting } from "obsidian";
import { OpenAISettings } from ".";

export class OpenAIProvider implements Provider {
    integration: Integration = Integration.OPENAI;
    name: string = "Open AI";
    description: "OpenAI the evilest company in the world";
    settings: OpenAISettings
    completer: Completer;
    models: string[];
    constructor(settings: OpenAISettings) {
        this.settings = settings;
    }
    loadCompleter: () => Promise<void> = async () => { };
    displaySettings(plugin: Inscribe, containerEl: HTMLElement): void {
        containerEl.createEl("h3", { text: "OpenAI Settings" });

        new Setting(containerEl)
            .setName("API Key")
            .setDesc("Enter the OpenAI API key.")
            .addText((text) =>
                text
                    .setPlaceholder(this.settings.apiKey)
                    .setValue(this.settings.apiKey)
                    .onChange(async (value) => {
                        this.settings.apiKey = value;
                        await plugin.saveSettings();
                    })
            );
        new Setting(containerEl)
            .setName("Model")
            .setDesc("Choose the OpenAI model.")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("gpt-4", "GPT-4")
                    .addOption("davinci", "Davinci")
                    .setValue(this.settings.model)
                    .onChange(async (value) => {
                        this.settings.model = value;
                        await plugin.saveSettings();
                    });
            });
    }

    availableModels(): string[] {
        return ["gpt-4", "davinci"];
    }
}