import { addIcon, Setting } from "obsidian";
import { Integration } from "..";
import { Provider } from "../provider";
import OllamaCompleter from "./completer";
import { OllamaSettings } from "./settings";
import Inscribe from "src/main";
import { ListResponse, ModelResponse, Ollama } from "ollama";

export class OllamaProvider implements Provider {
    integration: Integration = Integration.OLLAMA;
    name: string = "Ollama";
    description: "Ollama is a language model that can generate text based on a prompt.";
    settings: OllamaSettings;
    completer: OllamaCompleter;
    client: Ollama;

    constructor(settings: OllamaSettings) {
        this.settings = settings;
        this.client = new Ollama({ host: this.settings.host });
    }

    async loadCompleter(): Promise<void> {
        console.log("loading ollama completer");
        this.completer = new OllamaCompleter(this.settings, this.client);
    }

    async availableModels(): Promise<string[]> {
        const response: ListResponse = await this.client.list();
        return response.models.map((model: ModelResponse) => model.name);
    }

    displaySettings(plugin: Inscribe, containerEl: HTMLElement, display: () => Promise<void>): void {
        containerEl.createEl("h3", { text: "Ollama Settings" });

        new Setting(containerEl)
            .setName("Host")
            .setDesc("Enter the Ollama host.")
            .addText((text) =>
                text
                    .setPlaceholder(this.settings.host)
                    .setValue(this.settings.host)
                    .onChange(async (value) => {
                        this.settings.host = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Model")
            .setDesc("Choose the Ollama model.")
            .addExtraButton((button) => {
                button.setTooltip("Refresh model list").onClick(async () => {
                    this.settings.models = await this.availableModels();
                    await plugin.saveSettings();
                    display();
                });
            })
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(Object.fromEntries(this.settings.models.map(model => [model, model])))
                    .setValue(this.settings.model)
                    .onChange(async (value) => {
                        this.settings.model = value;
                        await plugin.saveSettings();
                        display();
                    })
            });
    }
}