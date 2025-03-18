import { App, Modal, Setting } from 'obsidian';
import { ProviderType } from 'src/providers';
import Inscribe from 'src/main';

export class ProviderSettingsModal extends Modal {
    plugin: Inscribe;
    providerType: ProviderType;

    constructor(app: App, plugin: Inscribe, providerType: ProviderType) {
        super(app);
        this.plugin = plugin;
        this.providerType = providerType;
        this.modalEl.addClass('inscribe-provider-settings-modal');
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        switch (this.providerType) {
            case ProviderType.OLLAMA:
                this.renderOllamaSettings();
                break;
            case ProviderType.OPENAI:
                this.renderOpenAISettings();
                break;
        }
    }


    async renderOllamaSettings() {
        const { contentEl } = this;
        this.setTitle('Ollama Settings');

        let host = this.plugin.settings.providers.ollama.host;

        new Setting(contentEl)
            .setName("Ollama Host")
            .setDesc("The host of the Ollama API")
            .addText((text) => {
                text
                    .setValue(host)
                    .onChange((value) => {
                        host = value;
                    });
            })
        new Setting(contentEl)
            .setTooltip("Save changes")
            .addButton((btn) =>
                btn
                    .setButtonText('Save')
                    .setCta()
                    .onClick(async () => {
                        this.close();
                        this.plugin.settings.providers.ollama.host = host;
                        await this.plugin.saveSettings();
                    }));
    }

    async renderOpenAISettings() {
        const { contentEl } = this;
        this.setTitle('OpenAI Settings');

        let apiKey = this.plugin.settings.providers.openai.apiKey;

        new Setting(contentEl)
            .setName("OpenAI API Key")
            .setDesc("The API key for OpenAI")
            .addText((text) => {
                text
                    .setValue(apiKey)
                    .onChange((value) => {
                        apiKey = value;
                    });
            })
        new Setting(contentEl)
            .setTooltip("Save changes")
            .addButton((btn) =>
                btn
                    .setButtonText('Save')
                    .setCta()
                    .onClick(async () => {
                        this.close();
                        this.plugin.settings.providers.openai.apiKey = apiKey;
                        await this.plugin.saveSettings();
                    }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 