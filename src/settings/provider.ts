import { App, Modal, Notice, Setting } from 'obsidian';
import { ProviderType } from 'src/providers';
import Inscribe from 'src/main';

export class ProviderSettingsModal extends Modal {
    private plugin: Inscribe;
    private providerType: ProviderType;
    private onCloseCallback: () => void;

    constructor(app: App, plugin: Inscribe, providerType: ProviderType, onCloseCallback: () => void) {
        super(app);
        this.plugin = plugin;
        this.providerType = providerType;
        this.modalEl.addClass('inscribe-provider-settings-modal');
        this.onCloseCallback = onCloseCallback;
    }

    onOpen() {
        this.renderProviderSettings();
    }

    async renderProviderSettings() {
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
            case ProviderType.GEMINI:
                this.renderGeminiSettings();
                break;
            case ProviderType.GROK:
                this.renderGrokSettings();
                break;
            default:
                contentEl.createEl('h2', { text: 'Unknown provider type' });
                break;
        }
    }

    async renderOllamaSettings() {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('Ollama');

        new Setting(contentEl)
            .setName("Ollama host")
            .setDesc("The host of the Ollama API")
            .addText((text) => {
                text
                    .setValue(this.plugin.settings.providers.ollama.host)
                    .onChange(async (value) => {
                        this.plugin.settings.providers.ollama.host = value;
                        await this.plugin.saveSettings();
                    });
            });

        this.renderModelSettings(this.plugin.settings.providers.ollama);
        this.renderConnectionStatus(this.plugin.settings.providers.ollama);
    }

    async renderOpenAISettings() {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('OpenAI');

        new Setting(contentEl)
            .setName("OpenAI API key")
            .setDesc("The API key for OpenAI")
            .addText((text) => {
                text
                    .setValue(this.plugin.settings.providers.openai.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.providers.openai.apiKey = value;
                        await this.plugin.saveSettings();
                    });
            });

        this.renderModelSettings(this.plugin.settings.providers.openai);
        this.renderConnectionStatus(this.plugin.settings.providers.openai);
    }

    async renderOpenAICompatibleSettings() {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('OpenAI compatible provider');

        new Setting(contentEl)
            .setName("API key")
            .setDesc("The API key for OpenAI compatible provider")
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

        this.renderModelSettings(this.plugin.settings.providers.openai_compatible);
        this.renderConnectionStatus(this.plugin.settings.providers.openai_compatible);
    }

    async renderGeminiSettings() {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('Gemini');

        new Setting(contentEl)
            .setName("Gemini API key")
            .setDesc("The API key for Gemini")
            .addText((text) => {
                text
                    .setValue(this.plugin.settings.providers.gemini.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.providers.gemini.apiKey = value;
                        await this.plugin.saveSettings();
                    });
            });
        this.renderModelSettings(this.plugin.settings.providers.gemini);
        this.renderConnectionStatus(this.plugin.settings.providers.gemini);
    }

    async renderGrokSettings() {
        const { contentEl } = this;
        contentEl.empty();
        this.setTitle('Grok');

        new Setting(contentEl)
            .setName("Grok API key")
            .setDesc("The API key for xAI Grok")
            .addText((text) => {
                text
                    .setValue(this.plugin.settings.providers.grok.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.providers.grok.apiKey = value;
                        await this.plugin.saveSettings();
                    });
            });

        this.renderModelSettings(this.plugin.settings.providers.grok);
        this.renderConnectionStatus(this.plugin.settings.providers.grok);
    }

    private renderModelSettings(provider: { models: string[] }) {
        new Setting(this.contentEl)
            .setName("Available models")
            .setDesc("Update the list of available models.")
            .addExtraButton((btn) => {
                btn
                    .setIcon("refresh-cw")
                    .setTooltip("Refresh models from provider")
                    .onClick(async () => {
                        provider.models = await this.plugin.providerFactory.fetchModels(this.providerType);
                        await this.plugin.saveSettings();
                        new Notice("Models refreshed");
                        this.renderProviderSettings();
                    });
            })
            .addTextArea((text) => {
                const modelsJson = JSON.stringify(provider.models, null, 2);
                text.inputEl.rows = 12;
                text
                    .setValue(modelsJson)
                    .setPlaceholder("[]")
                    .onChange(async (value) => {
                        try {
                            const models = JSON.parse(value);
                            provider.models = models;
                            await this.plugin.saveSettings();
                        } catch (e) {
                            new Notice("Invalid JSON format");
                        }
                    });
            })
    }

    private renderConnectionStatus(provider: { configured: boolean }) {
        new Setting(this.contentEl)
            .setName("Status")
            .setDesc(`${provider.configured ? 'Successful' : 'Failed'}`)
            .addButton(button => {
                button
                    .setButtonText(`Connection test`)
                    .onClick(async () => {
                        button.setDisabled(true).setButtonText('Testing...');
                        provider.configured = await this.plugin.providerFactory.connectionTest(this.providerType);
                        await this.plugin.saveSettings();
                        new Notice(provider.configured ? 'Connected!' : 'Failed to connect');
                        this.renderProviderSettings();
                    });
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.onCloseCallback();
    }
}
