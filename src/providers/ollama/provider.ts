import { Setting } from "obsidian";
import { Integration } from "..";
import { Provider } from "../provider";
import OllamaCompleter from "./completer";
import { OllamaSettings } from "./settings";
import Inscribe from "src/main";

export class OllamaProvider implements Provider {
    integration: Integration = Integration.OLLAMA;
    name: string = "Ollama";
    description: "Ollama is a language model that can generate text based on a prompt.";
    settings: OllamaSettings;
    completer: OllamaCompleter;
    models: string[] = [];

    constructor(settings: OllamaSettings) {
        this.settings = settings;

        this.loadCompleter();
        console.log("OllamaProvider created");
    }

    async loadCompleter(): Promise<void> {
        console.log("loading ollama completer");
        this.completer = new OllamaCompleter(this.settings);
    }

    displaySettings(plugin: Inscribe, containerEl: HTMLElement): void {
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
            .addDropdown((dropdown) => {
                this.completer.fetchModels().then((models) => {
                    models.forEach((model) => {
                        dropdown.addOption(model, model);
                    });
                });
                dropdown
                    .setValue(this.settings.model)
                    .onChange(async (value) => {
                        this.settings.model = value;
                        await plugin.saveSettings();
                    })
            });
    }
}