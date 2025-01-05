import { App, Plugin, PluginSettingTab } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { InscribeSettings, DEFAULT_SETTINGS } from "./settings";
import Inscribe from "../main";
import React, { useState } from "react";

interface SettingsPageProps {
    settings: InscribeSettings;
    saveSettings: () => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, saveSettings }) => {
    const [provider, setProvider] = useState(settings.defaultProvider);
    const [openAIKey, setOpenAIKey] = useState(settings.openAI.apiKey);
    const [huggingFaceToken, setHuggingFaceToken] = useState(settings.huggingFace.accessToken);

    const handleProviderChange = async (value: string) => {
        console.log(value);
        setProvider(value);
        settings.defaultProvider = value;
        await saveSettings();
    };

    const handleOpenAIKeyChange = async (value: string) => {
        setOpenAIKey(value);
        settings.openAI.apiKey = value;
        await saveSettings();
    };

    const handleHuggingFaceTokenChange = async (value: string) => {
        setHuggingFaceToken(value);
        settings.huggingFace.accessToken = value;
        await saveSettings();
    };

    return (
        <div>
            <h2>AI Integration Settings</h2>

            {/* Provider Selection */}
            <div>
                <label>Default AI Provider:</label>
                <select
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="huggingface">Hugging Face</option>
                    <option value="custom">Custom</option>
                </select>
            </div>

            {/* Conditional Fields Based on Provider */}
            {provider === "openai" && (
                <div>
                    <h3>OpenAI Settings</h3>
                    <label>API Key:</label>
                    <input
                        type="text"
                        value={openAIKey}
                        onChange={(e) => handleOpenAIKeyChange(e.target.value)}
                        placeholder="sk-..."
                    />
                </div>
            )}

            {provider === "huggingface" && (
                <div>
                    <h3>Hugging Face Settings</h3>
                    <label>Access Token:</label>
                    <input
                        type="text"
                        value={huggingFaceToken}
                        onChange={(e) => handleHuggingFaceTokenChange(e.target.value)}
                        placeholder="hf_..."
                    />
                </div>
            )}

            {/* Add More Providers Here */}
        </div>
    );
};

export default SettingsPage;


export class InscribeSettingTab extends PluginSettingTab {
    plugin: Inscribe;
    root: Root | null = null; // Keep track of the React root for cleanup

    constructor(app: App, plugin: Inscribe) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        // Clear existing content
        containerEl.empty();

        // Create a new React root if it doesn't exist
        if (!this.root) {
            this.root = createRoot(containerEl);
        }

        // Render the React component
        this.root.render(
            <SettingsPage
                settings={this.plugin.settings}
                saveSettings={() => this.plugin.saveSettings()}
            />
        );
    }

    hide(): void {
        // Clean up React root to avoid memory leaks
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}