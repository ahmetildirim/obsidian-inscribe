import { App, PluginSettingTab, Setting, ButtonComponent, ExtraButtonComponent, TextAreaComponent, DropdownComponent } from "obsidian";
import { TEMPLATE_VARIABLES } from "src/prompt/prompt";
import { SplitStrategy } from "src/extension";
import Inscribe from "src/main";
import { ProviderType } from "src/providers";
import { DEFAULT_PROFILE, newProfile, Profile } from "./index";
import { ProviderSettingsModal } from "./provider-modal";

// Constants for UI text and configuration
const UI_STRINGS = {
    PROVIDERS: {
        TITLE: "Providers",
        DESCRIPTION: "Configure the AI providers you want to use for completions",
        OLLAMA: {
            NAME: "Ollama",
            DESC: "Local AI provider running on your machine"
        },
        OPENAI: {
            NAME: "OpenAI",
            DESC: "Cloud-based AI provider"
        }
    },
    PROFILES: {
        TITLE: "Profiles",
        MANAGE: {
            NAME: "Manage profile",
            DESC: "Configure the settings for each profile. A profile can be assigned to paths. The default profile is used when no profile is assigned."
        }
    },
    TOOLTIPS: {
        CONFIGURED: "Provider configured",
        NOT_CONFIGURED: "Provider not configured",
        CONFIGURE: "Configure",
        CREATE_PROFILE: "Create new profile",
        DELETE_PROFILE: "Delete profile",
        CANT_DELETE_DEFAULT: "Cannot delete default profile",
        INSERT_VARIABLES: "Insert template variables"
    }
} as const;

export class InscribeSettingsTab extends PluginSettingTab {
    private readonly sections: {
        providers: HTMLElement;
        profiles: HTMLElement;
        profile: HTMLElement;
    };
    private displayedProfileId: string = DEFAULT_PROFILE;

    constructor(app: App, private plugin: Inscribe) {
        super(app, plugin);
        this.sections = {
            providers: document.createElement('div'),
            profiles: document.createElement('div'),
            profile: document.createElement('div')
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

        await this.renderProviderSection();
        await this.renderProfilesSection();
    }

    private async renderProviderSection(): Promise<void> {
        const { providers } = this.sections;
        providers.empty();

        providers.createEl("h1", { text: UI_STRINGS.PROVIDERS.TITLE });
        providers.createEl("p", { text: UI_STRINGS.PROVIDERS.DESCRIPTION });

        // Render provider settings
        await this.createProviderSetting(ProviderType.OLLAMA);
        await this.createProviderSetting(ProviderType.OPENAI);
    }

    private async createProviderSetting(type: ProviderType): Promise<void> {
        const providerConfig = type === ProviderType.OLLAMA
            ? { name: UI_STRINGS.PROVIDERS.OLLAMA.NAME, desc: UI_STRINGS.PROVIDERS.OLLAMA.DESC }
            : { name: UI_STRINGS.PROVIDERS.OPENAI.NAME, desc: UI_STRINGS.PROVIDERS.OPENAI.DESC };

        const isConfigured = this.plugin.settings.providers[type].configured;

        new Setting(this.sections.providers)
            .setName(providerConfig.name)
            .setDesc(providerConfig.desc)
            .addExtraButton((button: ExtraButtonComponent) => {
                button
                    .setIcon(isConfigured ? "check-circle" : "alert-circle")
                    .setTooltip(isConfigured ? UI_STRINGS.TOOLTIPS.CONFIGURED : UI_STRINGS.TOOLTIPS.NOT_CONFIGURED);
            })
            .addButton((button: ButtonComponent) => {
                button
                    .setIcon("settings")
                    .setTooltip(`${UI_STRINGS.TOOLTIPS.CONFIGURE} ${providerConfig.name}`)
                    .onClick(() => this.openProviderModal(type));
            });
    }

    private async openProviderModal(type: ProviderType): Promise<void> {
        new ProviderSettingsModal(
            this.app,
            this.plugin,
            type,
            () => this.renderProviderSection()
        ).open();
    }

    private async renderProfilesSection(): Promise<void> {
        const { profiles } = this.sections;
        profiles.empty();

        profiles.createEl("h1", { text: UI_STRINGS.PROFILES.TITLE });

        const displayedProfile = this.plugin.settings.profiles[this.displayedProfileId];
        await this.createProfileManager();
        await this.renderProfileSettings(displayedProfile);
    }

    private async createProfileManager(): Promise<void> {
        new Setting(this.sections.profiles)
            .setHeading()
            .setName(UI_STRINGS.PROFILES.MANAGE.NAME)
            .setDesc(UI_STRINGS.PROFILES.MANAGE.DESC)
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
            .setTooltip(UI_STRINGS.TOOLTIPS.CREATE_PROFILE)
            .onClick(async () => {
                this.displayedProfileId = newProfile(this.plugin.settings.profiles);
                await this.plugin.saveSettings();
                await this.renderProfilesSection();
            });
    }

    private createDeleteProfileButton(button: ExtraButtonComponent): void {
        const isDefault = this.displayedProfileId === DEFAULT_PROFILE;
        button
            .setDisabled(isDefault)
            .setIcon("trash")
            .setTooltip(isDefault ? UI_STRINGS.TOOLTIPS.CANT_DELETE_DEFAULT : UI_STRINGS.TOOLTIPS.DELETE_PROFILE)
            .onClick(async () => {
                delete this.plugin.settings.profiles[this.displayedProfileId];
                this.displayedProfileId = DEFAULT_PROFILE;
                await this.plugin.saveSettings();
                await this.renderProfilesSection();
            });
    }

    private async renderProfileSettings(profile: Profile): Promise<void> {
        const { profile: profileSection } = this.sections;
        profileSection.empty();

        // Create settings groups
        const groups = this.createSettingGroups(profile);
        await Promise.all(Object.values(groups).map(group => group.render()));
    }

    private createSettingGroups(profile: Profile) {
        return {
            basic: new ProfileBasicSettingsGroup(this.sections.profile, profile, this.plugin),
            model: new ProfileModelSettingsGroup(this.sections.profile, profile, this.plugin),
            completion: new ProfileCompletionSettingsGroup(this.sections.profile, profile, this.plugin),
            prompts: new ProfilePromptSettingsGroup(this.sections.profile, profile, this.plugin)
        };
    }
}

// Setting Group Classes for better organization
abstract class SettingsGroup {
    constructor(
        protected container: HTMLElement,
        protected profile: Profile,
        protected plugin: Inscribe
    ) { }

    abstract render(): Promise<void>;

    protected async saveSettings(): Promise<void> {
        await this.plugin.saveSettings();
    }
}

class ProfileBasicSettingsGroup extends SettingsGroup {
    async render(): Promise<void> {
        new Setting(this.container)
            .setName("Profile Name")
            .setDesc("Name of the profile")
            .addText((text) => {
                text
                    .setValue(this.profile.name)
                    .onChange(async (value) => {
                        this.profile.name = value;
                        await this.saveSettings();
                    });
            });
    }
}

class ProfileModelSettingsGroup extends SettingsGroup {
    async render(): Promise<void> {
        // Provider Selection
        new Setting(this.container)
            .setName("AI Provider")
            .setDesc("Choose your preferred AI provider")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption(ProviderType.OLLAMA, "Ollama")
                    .addOption(ProviderType.OPENAI, "OpenAI")
                    .setValue(this.profile.provider)
                    .onChange(async (value: ProviderType) => {
                        this.profile.provider = value;
                        await this.saveSettings();
                    });
            });

        // Model Selection
        new Setting(this.container)
            .setName("Model")
            .setDesc("Select the model to use for completions")
            .addDropdown((dropdown) => {
                const models = this.profile.provider === ProviderType.OLLAMA
                    ? this.plugin.settings.providers.ollama.models
                    : this.plugin.settings.providers.openai.models;

                models.forEach(model => dropdown.addOption(model, model));
                dropdown
                    .setValue(this.profile.completionOptions.model)
                    .onChange(async (value) => {
                        this.profile.completionOptions.model = value;
                        await this.saveSettings();
                    });
            });
    }
}

class ProfileCompletionSettingsGroup extends SettingsGroup {
    async render(): Promise<void> {
        // Temperature Setting
        new Setting(this.container)
            .setName("Temperature")
            .setDesc("Control the randomness of completions (0 = deterministic, 1 = creative)")
            .addSlider((slider) => {
                slider
                    .setLimits(0, 1, 0.1)
                    .setValue(this.profile.completionOptions.temperature)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.profile.completionOptions.temperature = value;
                        await this.saveSettings();
                    });
            });

        // Delay Setting
        new Setting(this.container)
            .setName("Suggestion Delay")
            .setDesc("Delay in milliseconds before fetching suggestions")
            .addSlider((slider) => {
                slider
                    .setLimits(0, 2000, 100)
                    .setValue(this.profile.delayMs)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.profile.delayMs = value;
                        await this.saveSettings();
                    });
            });

        // Split Strategy Setting
        new Setting(this.container)
            .setName("Completion Strategy")
            .setDesc("Choose how completions should be split and accepted")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("word", "Word by Word")
                    .addOption("sentence", "Sentence by Sentence")
                    .addOption("paragraph", "Paragraph by Paragraph")
                    .addOption("full", "Full Completion")
                    .setValue(this.profile.splitStrategy)
                    .onChange(async (value: SplitStrategy) => {
                        this.profile.splitStrategy = value;
                        await this.saveSettings();
                    });
            });
    }
}

class ProfilePromptSettingsGroup extends SettingsGroup {
    async render(): Promise<void> {
        // System Prompt
        new Setting(this.container)
            .setName("System Prompt")
            .setDesc("Set the system prompt that defines the AI's behavior")
            .addTextArea((text) => {
                text.inputEl.rows = 3;
                text.inputEl.style.width = "100%";
                text
                    .setValue(this.profile.completionOptions.systemPrompt)
                    .onChange(async (value) => {
                        this.profile.completionOptions.systemPrompt = value;
                        await this.saveSettings();
                    });
            });

        // User Prompt
        new Setting(this.container)
            .setName("User Prompt")
            .setDesc("Configure the prompt template for completions")
            .addExtraButton((button) => {
                button
                    .setIcon("list")
                    .setTooltip(UI_STRINGS.TOOLTIPS.INSERT_VARIABLES)
                    .onClick(async () => {
                        const text = this.profile.completionOptions.userPrompt + "\n" + TEMPLATE_VARIABLES;
                        this.profile.completionOptions.userPrompt = text;
                        await this.saveSettings();
                        await this.render();
                    });
            })
            .addTextArea((text) => {
                text.inputEl.rows = 3;
                text.inputEl.style.width = "100%";
                text
                    .setValue(this.profile.completionOptions.userPrompt)
                    .onChange(async (value) => {
                        this.profile.completionOptions.userPrompt = value;
                        await this.saveSettings();
                    });
            });
    }
}
