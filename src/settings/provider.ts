import { App, Modal, Notice, Setting } from 'obsidian';
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
            case ProviderType.OPENAI_COMPATIBLE:
                this.renderOpenAICompatibleSettings();
                break;
            default:
                contentEl.createEl('h2', { text: 'Unknown provider type' });
                break;
        }
    }


    async renderOllamaSettings() {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('Ollama Settings');
        new Setting(contentEl)
            .setName("Ollama Host")
            .setDesc("The host of the Ollama API")
            .addText((text) => {
                text
                    .setValue(this.plugin.settings.providers.ollama.host)
                    .onChange(async (value) => {
                        this.plugin.settings.providers.ollama.host = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(contentEl)
            .setName("Status")
            .setDesc(`${this.plugin.settings.providers.ollama.configured ? 'Successful' : 'Failed'}`)
            .addButton(button => {
                button
                    .setButtonText(`Test Connection`)
                    .onClick(async () => {
                        this.plugin.settings.providers.ollama.configured = await this.plugin.providerFactory.testConnection(ProviderType.OLLAMA);
                        await this.plugin.saveSettings();
                        new Notice(this.plugin.settings.providers.ollama.configured
                            ? 'Successfully connected to Ollama'
                            : 'Failed to connect to Ollama');
                        this.renderOllamaSettings();
                    });
            });
    }

    async renderOpenAISettings() {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('OpenAI Settings');

        new Setting(contentEl)
            .setName("OpenAI API Key")
            .setDesc("The API key for OpenAI")
            .addText((text) => {
                text
                    .setValue(this.plugin.settings.providers.openai.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.providers.openai.apiKey = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(contentEl)
            .setName("Status")
            .setDesc(`${this.plugin.settings.providers.openai.configured ? 'Successful' : 'Failed'}`)
            .addButton(button => {
                button
                    .setButtonText(`Test Connection`)
                    .onClick(async () => {
                        this.plugin.settings.providers.openai.configured = await this.plugin.providerFactory.testConnection(ProviderType.OPENAI);
                        await this.plugin.saveSettings();
                        new Notice(this.plugin.settings.providers.openai.configured
                            ? 'Successfully connected to OpenAI'
                            : 'Failed to connect to OpenAI');
                        this.renderOpenAISettings();
                    });
            });
    }

    async renderOpenAICompatibleSettings() {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('OpenAI Compatible Provider Settings');

        new Setting(contentEl)
            .setName("API Key")
            .setDesc("The API key for OpenAI Compatible Provider")
            .addText((text) => {
                text
                    .setValue(this.plugin.settings.providers.openai_compatible.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.providers.openai_compatible.apiKey = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(contentEl)
            .setName("Base URL")
            .setDesc("The base URL for OpenAI Compatible Provider")
            .addText((text) => {
                text
                    .setValue(this.plugin.settings.providers.openai_compatible.baseUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.providers.openai_compatible.baseUrl = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(contentEl)
            .setName("Status")
            .setDesc(`${this.plugin.settings.providers.openai_compatible.configured ? 'Successful' : 'Failed'}`)
            .addButton(button => {
                button
                    .setButtonText(`Test Connection`)
                    .onClick(async () => {
                        this.plugin.settings.providers.openai_compatible.configured = await this.plugin.providerFactory.testConnection(ProviderType.OPENAI_COMPATIBLE);
                        await this.plugin.saveSettings();
                        new Notice(this.plugin.settings.providers.openai_compatible.configured
                            ? 'Successfully connected to OpenAI Compatible Provider'
                            : 'Failed to connect to OpenAI Compatible Provider');
                        this.renderOpenAICompatibleSettings();
                    });
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();

        const setting = (this.plugin.app as any).setting;
        setting.open();
        setting.openTabById(this.plugin.manifest.id);
    }
} 