import { App, PluginSettingTab, Setting, ButtonComponent, ExtraButtonComponent, TextAreaComponent, DropdownComponent } from "obsidian";
import { TEMPLATE_VARIABLES } from "src/prompt/prompt";
import { SplitStrategy } from "src/extension";
import Inscribe from "src/main";
import { ProviderType } from "src/providers";
import { DEFAULT_PROFILE, newProfile, Profile } from "./index";
import { ProviderSettingsModal } from "./provider-modal";

export class InscribeSettingsTab extends PluginSettingTab {
    private readonly sections: {
        providers: HTMLElement;
        profiles: HTMLElement;
        profile: HTMLElement;
        pathMappings: HTMLElement;
    };
    private displayedProfileId: string = DEFAULT_PROFILE;

    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
        this.sections = {
            providers: document.createElement('div'),
            profiles: document.createElement('div'),
            profile: document.createElement('div'),
            pathMappings: document.createElement('div')
        };
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        // Initialize section containers with proper spacing
        Object.values(this.sections).forEach(section => {
            containerEl.appendChild(section);
            containerEl.createEl("br");
        });

        await this.renderProviders();
        await this.renderProfiles();
        await this.renderPathMappings();
    }

    private async renderProviders(): Promise<void> {
        const { providers } = this.sections;
        providers.empty();

        providers.createEl("h3", { text: "Providers" });
        providers.createEl("p", { text: "Configure the AI providers you want to use for completions" });

        // Ollama Provider
        new Setting(providers)
            .setName("Ollama")
            .setDesc("Local AI provider running on your machine")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText("Configure")
                    .setTooltip("Configure Ollama")
                    .onClick(() => this.openProviderModal(ProviderType.OLLAMA));
            });

        // OpenAI Provider
        new Setting(providers)
            .setName("OpenAI")
            .setDesc("OpenAI API provider")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText("Configure")
                    .setTooltip("Configure OpenAI")
                    .onClick(() => this.openProviderModal(ProviderType.OPENAI));
            });
    }

    private async openProviderModal(type: ProviderType): Promise<void> {
        new ProviderSettingsModal(
            this.app,
            this.plugin,
            type,
            () => this.renderProviders()
        ).open();
    }

    private async renderProfiles(): Promise<void> {
        const { profiles } = this.sections;
        profiles.empty();

        profiles.createEl("h3", { text: "Profiles" });
        profiles.createEl("p", { text: "Configure the settings for each profile. A profile can be assigned to paths. The default profile is used when no profile is assigned." });

        const displayedProfile = this.plugin.settings.profiles[this.displayedProfileId];
        await this.renderProfileSelection();
        await this.renderProfileSettings(displayedProfile);
    }

    private async renderProfileSelection(): Promise<void> {
        //addd padding
        this.sections.profiles.createEl("br");
        new Setting(this.sections.profiles)
            .setHeading()
            .setName("Manage profile")
            .setDesc("Select a profile to configure its settings")
            .addDropdown(this.createProfileDropdown.bind(this))
            .addExtraButton(this.createNewProfileButton.bind(this))
            .addExtraButton(this.createDeleteProfileButton.bind(this));
    }

    private createProfileDropdown(dropdown: DropdownComponent): void {
        Object.entries(this.plugin.settings.profiles).forEach(([id, profile]) => {
            dropdown.addOption(id, profile.name);
        });

        dropdown
            .setValue(this.displayedProfileId)
            .onChange(async (value) => {
                this.displayedProfileId = value;
                await this.renderProfileSettings(this.plugin.settings.profiles[value]);
            });
    }

    private createNewProfileButton(button: ExtraButtonComponent): void {
        button
            .setIcon("plus")
            .setTooltip("Create new profile")
            .onClick(async () => {
                this.displayedProfileId = newProfile(this.plugin.settings.profiles);
                await this.plugin.saveSettings();
                await this.renderProfiles();
            });
    }

    private createDeleteProfileButton(button: ExtraButtonComponent): void {
        const isDefault = this.displayedProfileId === DEFAULT_PROFILE;
        button
            .setDisabled(isDefault)
            .setIcon("trash")
            .setTooltip(isDefault ? "Cannot delete default profile" : "Delete profile")
            .onClick(async () => {
                delete this.plugin.settings.profiles[this.displayedProfileId];
                this.displayedProfileId = DEFAULT_PROFILE;
                await this.plugin.saveSettings();
                await this.renderProfiles();
            });
    }

    private async renderProfileSettings(profile: Profile): Promise<void> {
        const { profile: profileSection } = this.sections;
        profileSection.empty();

        // Profile Name
        new Setting(profileSection)
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

        // Provider Selection
        new Setting(profileSection)
            .setName("AI Provider")
            .setDesc("Choose your preferred AI provider")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption(ProviderType.OLLAMA, "Ollama")
                    .addOption(ProviderType.OPENAI, "OpenAI")
                    .setValue(profile.provider)
                    .onChange(async (value: ProviderType) => {
                        profile.provider = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Model Selection
        new Setting(profileSection)
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

        // Temperature Setting
        new Setting(profileSection)
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

        // Delay Setting
        new Setting(profileSection)
            .setName("Suggestion Delay")
            .setDesc("Delay in milliseconds before fetching suggestions")
            .addText((text) => {
                text.inputEl.setAttr("type", "number");
                text
                    .setPlaceholder("1000")
                    .setValue(String(profile.delayMs))
                    .onChange(async (value) => {
                        profile.delayMs = parseInt(value);
                        await this.plugin.saveSettings();
                    });
            });

        // Split Strategy Setting
        new Setting(profileSection)
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

        // System Prompt
        new Setting(profileSection)
            .setName("System Prompt")
            .setDesc("Set system prompt")
            .addTextArea((text) => {
                text.inputEl.rows = 3;
                text.inputEl.setCssStyles({ width: "100%", resize: "vertical", position: "relative" }); text
                    .setValue(profile.completionOptions.systemPrompt)
                    .onChange(async (value) => {
                        profile.completionOptions.systemPrompt = value;
                        await this.plugin.saveSettings();
                    });
            });

        // User Prompt
        new Setting(profileSection)
            .setName("User Prompt")
            .setDesc("User prompt template ")
            .addExtraButton((button) => {
                button
                    .setIcon("list")
                    .setTooltip("Insert mustache template variables")
                    .onClick(async () => {
                        const text = profile.completionOptions.userPrompt + "\n" + TEMPLATE_VARIABLES;
                        profile.completionOptions.userPrompt = text;
                        await this.plugin.saveSettings();
                        await this.renderProfileSettings(profile);
                    });
            })
            .addTextArea((text) => {
                text.inputEl.rows = 3;
                text.inputEl.setCssStyles({ width: "100%", resize: "vertical", position: "relative" });
                text
                    .setValue(profile.completionOptions.userPrompt)
                    .onChange(async (value) => {
                        profile.completionOptions.userPrompt = value;
                        await this.plugin.saveSettings();
                    });
            });
    }

    private async renderPathMappings(): Promise<void> {
        const { pathMappings } = this.sections;
        pathMappings.empty();

        pathMappings.createEl("h3", { text: "Path Mappings" });
        pathMappings.createEl("p", { text: "Configure which profile to use for specific paths. Paths are matched by prefix, with longer paths taking precedence. For example, '/Daily' will match all files in the Daily folder." });

        // Add spacing
        pathMappings.createEl("br");

        // Add button to create new mapping
        new Setting(pathMappings)
            .setHeading()
            .setName("Add Path Mapping")
            .addButton((button) => {
                button
                    .setButtonText("Add")
                    .onClick(async () => {
                        // Add a new empty mapping
                        this.plugin.settings.path_mappings[""] = DEFAULT_PROFILE;
                        await this.plugin.saveSettings();
                        await this.renderPathMappings();
                    });
            });

        // Add spacing
        pathMappings.createEl("br");

        // Render existing mappings
        Object.entries(this.plugin.settings.path_mappings).forEach(([path, profileName]) => {
            new Setting(pathMappings)
                .setName(path || "Root")
                .addText((text) => {
                    text
                        .setPlaceholder("Enter path (e.g., Daily/Work)")
                        .setValue(path)
                        .onChange(async (value) => {
                            // Remove old mapping and add new one
                            delete this.plugin.settings.path_mappings[path];
                            this.plugin.settings.path_mappings[value] = profileName;
                            await this.plugin.saveSettings();
                        });
                })
                .addDropdown((dropdown) => {
                    // Add all available profiles to the dropdown
                    Object.entries(this.plugin.settings.profiles).forEach(([id, profile]) => {
                        dropdown.addOption(id, profile.name);
                    });
                    dropdown
                        .setValue(profileName)
                        .onChange(async (value) => {
                            this.plugin.settings.path_mappings[path] = value;
                            await this.plugin.saveSettings();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("trash")
                        .setTooltip("Delete mapping")
                        .onClick(async () => {
                            delete this.plugin.settings.path_mappings[path];
                            await this.plugin.saveSettings();
                            await this.renderPathMappings();
                        });
                });
        });
    }
}
