import { App, Modal, Setting } from "obsidian";
import { ProviderType } from "src/providers";
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