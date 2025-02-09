import { App, PluginSettingTab, Setting, ButtonComponent, ExtraButtonComponent, TextAreaComponent, DropdownComponent } from "obsidian";
import { TEMPLATE_VARIABLES } from "src/prompt/prompt";
import { SplitStrategy } from "src/extension";
import Inscribe from "src/main";
import { ProviderType } from "src/providers";
import { DEFAULT_PROFILE, newProfile, Profile } from "./index";
import { ProviderSettingsModal } from "./provider-modal";

export class InscribeSettingsTab extends PluginSettingTab {
    private providersEl: HTMLElement;
    private profilesEl: HTMLElement;
    private profileEl: HTMLElement;
    private displayedProfileId: string = DEFAULT_PROFILE;

    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        containerEl.empty();

        // Create container elements
        this.providersEl = containerEl.createDiv();
        containerEl.createEl("br");
        this.profilesEl = containerEl.createDiv();
        this.profileEl = containerEl.createDiv();

        this.displayProviders();
        this.displayProfiles();
    }

    private displayProviders(): void {
        this.providersEl.empty();

        this.providersEl.createEl("h1", { text: "Providers" });
        this.providersEl.createEl("p", { text: "Configure the AI providers you want to use for completions" });

        // Ollama Provider
        new Setting(this.providersEl)
            .setName("Ollama")
            .setDesc("Local AI provider running on your machine")
            .addExtraButton((button: ExtraButtonComponent) => {
                const isConfigured = this.plugin.settings.providers.ollama.configured;
                button
                    .setIcon(isConfigured ? "check-circle" : "alert-circle")
                    .setTooltip(isConfigured ? "Provider configured" : "Provider not configured");
            })
            .addButton((button: ButtonComponent) => {
                button
                    .setIcon("settings")
                    .setTooltip("Configure Ollama")
                    .onClick(() => {
                        new ProviderSettingsModal(
                            this.app,
                            this.plugin,
                            ProviderType.OLLAMA,
                            () => this.displayProviders()
                        ).open();
                    });
            });

        // OpenAI Provider
        new Setting(this.providersEl)
            .setName("OpenAI")
            .setDesc("Cloud-based AI provider")
            .addExtraButton((button: ExtraButtonComponent) => {
                const isConfigured = this.plugin.settings.providers.openai.configured;
                button
                    .setIcon(isConfigured ? "check-circle" : "alert-circle")
                    .setTooltip(isConfigured ? "Provider configured" : "Provider not configured");
            })
            .addButton((button: ButtonComponent) => {
                button
                    .setIcon("settings")
                    .setTooltip("Configure OpenAI")
                    .onClick(() => {
                        new ProviderSettingsModal(
                            this.app,
                            this.plugin,
                            ProviderType.OPENAI,
                            () => this.displayProviders()
                        ).open();
                    });
            });
    }

    private async displayProfiles(): Promise<void> {
        this.profilesEl.empty();

        this.profilesEl.createEl("h1", { text: "Profiles" });
        // Profile Selection

        const displayesProfile = this.plugin.settings.profiles[this.displayedProfileId];
        new Setting(this.profilesEl)
            .setHeading()
            .setName("Manage profile")
            .setDesc("Configure the settings for each profile. A profile can be assigned to paths. The default profile is used when no profile is assigned.")
            .addDropdown((dropdown) => {
                Object.entries(this.plugin.settings.profiles).forEach(([id, profile]) => {
                    dropdown.addOption(id, profile.name);
                });

                dropdown
                    .setValue(this.displayedProfileId)
                    .onChange(async (value) => {
                        this.displayedProfileId = value;
                        this.displayProfile(this.plugin.settings.profiles[value]);
                    });
            })
            .addExtraButton((button) => {
                button
                    .setIcon("plus")
                    .setTooltip("Create new profile")
                    .onClick(async () => {
                        this.displayedProfileId = newProfile(this.plugin.settings.profiles);
                        await this.plugin.saveSettings();
                        this.displayProfiles();
                    });
            })
            .addExtraButton((button) => {
                button
                    .setDisabled(this.displayedProfileId === DEFAULT_PROFILE)
                    .setIcon("trash")
                    .setTooltip(this.displayedProfileId === DEFAULT_PROFILE ? "Cannot delete default profile" : "Delete profile")
                    .onClick(() => {
                        delete this.plugin.settings.profiles[this.displayedProfileId];
                        this.displayedProfileId = DEFAULT_PROFILE;
                        this.displayProfiles();
                    });
            });

        this.displayProfile(displayesProfile);
    }

    private async displayProfile(profile: Profile): Promise<void> {
        this.profileEl.empty();

        // Profile Name
        new Setting(this.profileEl)
            .setName("Profile Name")
            .setDesc("Name of the profile")
            .addText((text) => {
                text
                    .setValue(profile.name)
                    .onChange(async (value) => {
                        profile.name = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Provider
        new Setting(this.profileEl)
            .setName("AI Provider")
            .setDesc("Choose your preferred AI provider")
            .addDropdown((dropdown) => {
                dropdown.addOption(ProviderType.OLLAMA, "Ollama");
                dropdown.addOption(ProviderType.OPENAI, "OpenAI");
                dropdown
                    .setValue(profile.provider)
                    .onChange(async (value: ProviderType) => {
                        profile.provider = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Model
        new Setting(this.profileEl)
            .setName("Model")
            .setDesc("Select the model to use for completions")
            .addDropdown((dropdown) => {
                const models = profile.provider === ProviderType.OLLAMA
                    ? this.plugin.settings.providers.ollama.models
                    : this.plugin.settings.providers.openai.models;

                models.forEach(model => dropdown.addOption(model, model));
                dropdown
                    .setValue(profile.completionOptions.model)
                    .onChange(async (value) => {
                        profile.completionOptions.model = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Temperature
        new Setting(this.profileEl)
            .setName("Temperature")
            .setDesc("Control the randomness of completions (0 = deterministic, 1 = creative)")
            .addSlider((slider) => {
                slider
                    .setLimits(0, 1, 0.1)
                    .setValue(profile.completionOptions.temperature)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        profile.completionOptions.temperature = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(this.profileEl)
            .setName("Suggestion Delay")
            .setDesc("Delay in milliseconds before fetching suggestions")
            .addSlider((slider) => {
                slider
                    .setLimits(0, 2000, 100)
                    .setValue(profile.delayMs)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        profile.delayMs = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(this.profileEl)
            .setName("Completion Strategy")
            .setDesc("Choose how completions should be split and accepted")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("word", "Word by Word")
                    .addOption("sentence", "Sentence by Sentence")
                    .addOption("paragraph", "Paragraph by Paragraph")
                    .addOption("full", "Full Completion")
                    .setValue(profile.splitStrategy)
                    .onChange(async (value: SplitStrategy) => {
                        profile.splitStrategy = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(this.profileEl)
            .setName("System Prompt")
            .setDesc("Set the system prompt that defines the AI's behavior")
            .addTextArea((text) => {
                text.inputEl.rows = 3;
                text.inputEl.style.width = "100%";
                text
                    .setValue(profile.completionOptions.systemPrompt)
                    .onChange(async (value) => {
                        profile.completionOptions.systemPrompt = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(this.profileEl)
            .setName("User Prompt")
            .setDesc("Configure the prompt template for completions")
            .addExtraButton((button) => {
                button
                    .setIcon("list")
                    .setTooltip("Insert template variables")
                    .onClick(async () => {
                        const text = profile.completionOptions.userPrompt + "\n" + TEMPLATE_VARIABLES;
                        profile.completionOptions.userPrompt = text;
                        await this.plugin.saveSettings();
                        this.displayProfile(profile);
                    });
            })
            .addTextArea((text) => {
                text.inputEl.rows = 3;
                text.inputEl.style.width = "100%";
                text
                    .setValue(profile.completionOptions.userPrompt)
                    .onChange(async (value) => {
                        profile.completionOptions.userPrompt = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}
