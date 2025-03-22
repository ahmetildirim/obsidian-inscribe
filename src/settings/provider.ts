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

        this.renderConnectionStatus(this.plugin.settings.providers.ollama);
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

        this.renderConnectionStatus(this.plugin.settings.providers.openai);
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

        this.renderConnectionStatus(this.plugin.settings.providers.openai_compatible);
    }

    private renderConnectionStatus(provider: { configured: boolean }) {
        new Setting(this.contentEl)
            .setName("Status")
            .setDesc(`${provider.configured ? 'Successful' : 'Failed'}`)
            .addButton(button => {
                button
                    .setButtonText(`Connection Test`)
                    .onClick(async () => {
                        provider.configured = await this.plugin.providerFactory.connectionTest(this.providerType);
                        await this.plugin.saveSettings();
                        new Notice(provider.configured ? 'Connected!' : 'Failed to connect');
                        this.onOpen(); // Refresh the view
                    });
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        (this.plugin.app as any).setting?.openTabById(this.plugin.manifest.id);
    }
}