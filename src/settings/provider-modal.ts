import { App, Modal, Setting } from "obsidian";
import { ProviderType } from "src/providers";
import { Settings } from "./settings";
import Inscribe from "src/main";

export class ProviderSettingsModal extends Modal {
    constructor(
        app: App,
        private plugin: Inscribe,
        private providerType: ProviderType,
        private onSave: () => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        // Apply custom modal styles
        this.modalEl.addClass('inscribe-provider-modal');
        this.modalEl.style.width = '60vw';
        this.modalEl.style.height = 'auto';

        // Create a container for better styling
        const container = contentEl.createDiv({ cls: 'inscribe-modal-container' });

        const provider = this.providerType === ProviderType.OLLAMA ?
            this.plugin.settings.providers.ollama :
            this.plugin.settings.providers.openai;

        // Header section
        const header = container.createDiv({ cls: 'inscribe-modal-header' });
        header.createEl("h2", {
            text: `Configure ${provider.name}`,
            cls: 'inscribe-modal-title'
        });

        // Content section
        const content = container.createDiv({ cls: 'inscribe-modal-content' });

        if (this.providerType === ProviderType.OLLAMA) {
            const ollamaProvider = this.plugin.settings.providers.ollama;
            new Setting(content)
                .setClass('inscribe-modal-setting')
                .setName("Host")
                .setDesc("Your Ollama instance URL")
                .addText((text) => {
                    text
                        .setPlaceholder("http://localhost:11434")
                        .setValue(ollamaProvider.host)
                        .onChange(async (value) => {
                            ollamaProvider.host = value;
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.addClass('inscribe-modal-input');
                });
        } else {
            const openaiProvider = this.plugin.settings.providers.openai;
            new Setting(content)
                .setClass('inscribe-modal-setting')
                .setName("API Key")
                .setDesc("Your OpenAI API key")
                .addText((text) => {
                    text
                        .setPlaceholder("sk-...")
                        .setValue(openaiProvider.apiKey)
                        .onChange(async (value) => {
                            openaiProvider.apiKey = value;
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.addClass('inscribe-modal-input');
                });
        }

        // Add custom styles
        this.addStyles();
    }

    private addStyles() {
        const style = document.createElement('style');
        style.id = 'inscribe-modal-styles';
        style.textContent = `
            .inscribe-provider-modal {
                max-width: 800px !important;
                max-height: 80vh !important;
                width: 60vw !important;
                height: auto !important;
                border-radius: 12px !important;
            }

            .inscribe-modal-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                padding: 0;
            }

            .inscribe-modal-header {
                padding: 24px 32px;
                border-bottom: 1px solid var(--background-modifier-border);
            }

            .inscribe-modal-title {
                margin: 0;
                font-size: 1.5em;
                font-weight: 600;
                color: var(--text-normal);
            }

            .inscribe-modal-content {
                padding: 24px 32px;
                overflow-y: auto;
            }

            .inscribe-modal-setting {
                padding: 1rem 0;
                border: none;
            }

            .inscribe-modal-setting .setting-item-info {
                padding: 0 1rem 0 0;
            }

            .inscribe-modal-input {
                width: 100% !important;
                padding: 8px 12px !important;
                border-radius: 6px !important;
                background: var(--background-modifier-form-field) !important;
            }
        `;
        document.head.appendChild(style);
    }

    override onClose() {
        const { contentEl } = this;
        // Remove custom styles
        const style = document.getElementById('inscribe-modal-styles');
        if (style) {
            style.remove();
        }
        contentEl.empty();
        this.onSave();
    }
} 