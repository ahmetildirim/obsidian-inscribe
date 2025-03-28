import { App, PluginSettingTab, Setting, ButtonComponent, ExtraButtonComponent, DropdownComponent, TextComponent, ToggleComponent, Notice } from "obsidian";
import { TEMPLATE_VARIABLES } from "src/completions/prompt";
import { SplitStrategy } from "src/extension";
import Inscribe from "src/main";
import { ProviderType } from "src/providers";
import { createPathConfig, DEFAULT_PATH, DEFAULT_PROFILE, isDefaultProfile, Profile, resetSettings } from "./settings";
import { ProviderSettingsModal } from './provider';
import { createProfile } from ".";

export default class InscribeSettingsTab extends PluginSettingTab {
    private generalSection: GeneralSection;
    private providersSection: ProvidersSection;
    private profilesSection: ProfilesSection;
    private pathConfigsSection: PathConfigsSection;

    constructor(private plugin: Inscribe) {
        super(plugin.app, plugin);
    }

    display(): void {
        this.containerEl.empty();

        // General Section
        const generalContainer = document.createElement("div");
        this.containerEl.appendChild(generalContainer);

        const providersContainer = document.createElement("div");
        providersContainer.addClass("inscribe-section");
        this.containerEl.appendChild(providersContainer);

        const profilesContainer = document.createElement("div");
        profilesContainer.addClass("inscribe-section");
        this.containerEl.appendChild(profilesContainer);

        const pathMappingsContainer = document.createElement("div");
        pathMappingsContainer.addClass("inscribe-section");
        this.containerEl.appendChild(pathMappingsContainer);

        this.generalSection = new GeneralSection(generalContainer, this.plugin, this.display.bind(this));
        this.providersSection = new ProvidersSection(providersContainer, this.app, this.plugin);
        this.pathConfigsSection = new PathConfigsSection(pathMappingsContainer, this.plugin);
        this.profilesSection = new ProfilesSection(profilesContainer, this.plugin, this.pathConfigsSection.render.bind(this.pathConfigsSection));

        this.generalSection.render();
        this.providersSection.render();
        this.profilesSection.render();
        this.pathConfigsSection.render();
    }
}

class GeneralSection {
    private container: HTMLElement;
    private plugin: Inscribe;
    private displayFunc: () => void;

    constructor(container: HTMLElement, plugin: Inscribe, displayFunc: () => void) {
        this.container = container;
        this.plugin = plugin;
        this.displayFunc = displayFunc;
    }

    async render(): Promise<void> {
        this.container.empty();
        // Enabled
        new Setting(this.container)
            .setName("Enabled")
            .setDesc("Enable or disable completions globally")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.enabled = value;
                        await this.plugin.saveSettings();
                        this.plugin.statusBarItem.render();
                    });
            });

        // Reset Settings
        new Setting(this.container)
            .setName("Reset settings")
            .setDesc("Reset all settings to default")
            .addButton((button: ButtonComponent) => {
                button
                    .setWarning()
                    .setButtonText("Reset")
                    .setTooltip("Reset settings to default")
                    .onClick(async () => {
                        resetSettings(this.plugin.settings);
                        await this.plugin.saveSettings();
                        this.displayFunc();
                        this.plugin.statusBarItem.render();
                        new Notice("Settings reset to default");
                    });
            });
    }
}

class ProvidersSection {
    private container: HTMLElement;
    private plugin: Inscribe;
    private app: App;

    constructor(container: HTMLElement, app: App, plugin: Inscribe) {
        this.app = app;
        this.container = container;
        this.plugin = plugin;
    }

    async render(): Promise<void> {
        this.container.empty();
        new Setting(this.container)
            .setHeading()
            .setName("Providers")
            .setDesc("Configure your AI providers");

        // Ollama Provider
        new Setting(this.container)
            .setName("Ollama")
            .setDesc("Local AI provider running on your machine")
            .addButton((button: ButtonComponent) => this.createConfigureButton(
                button,
                ProviderType.OLLAMA,
                this.plugin.settings.providers.ollama.configured));

        // OpenAI Provider
        new Setting(this.container)
            .setName("OpenAI")
            .setDesc("OpenAI API")
            .addButton((button: ButtonComponent) => this.createConfigureButton(
                button,
                ProviderType.OPENAI,
                this.plugin.settings.providers.openai.configured));

        // OpenAI Compatible Provider
        new Setting(this.container)
            .setName("OpenAI compatible API")
            .setDesc("Use any OpenAI compatible provider")
            .addButton((button: ButtonComponent) => this.createConfigureButton(
                button,
                ProviderType.OPENAI_COMPATIBLE,
                this.plugin.settings.providers.openai_compatible.configured));
    }

    private createConfigureButton(button: ButtonComponent, type: ProviderType, configured: boolean): void {
        if (!configured) { button.setWarning(); }
        button
            .setButtonText(configured ? "Configured" : "Configure")
            .setTooltip(configured ? "Provider configured" : "Provider not configured")
            .onClick(() => {
                new ProviderSettingsModal(this.app, this.plugin, type, () => {
                    this.render();
                }).open();
            });
    }
}

class ProfilesSection {
    private container: HTMLElement;
    private plugin: Inscribe;
    private onProfileUpdate: () => void;
    private selectedProfileId: string = DEFAULT_PROFILE;

    constructor(container: HTMLElement, plugin: Inscribe, onProfileUpdate: () => void) {
        this.container = container;
        this.plugin = plugin;
        this.onProfileUpdate = onProfileUpdate;
    }

    async render(): Promise<void> {
        // Clear main container and re-append sub-containers
        this.container.empty();

        // Heading
        new Setting(this.container)
            .setHeading()
            .setName("Profiles")
            .setDesc("Create and manage profiles for different use cases. Profiles can be assigned to specific paths.");

        new Setting(this.container)
            .setName("Manage profile")
            .setDesc("Select a profile to configure its settings")
            .addDropdown((dropdown: DropdownComponent) => this.profileDropdown(dropdown))
            .addExtraButton((button: ExtraButtonComponent) => this.createNewProfileButton(button))
            .addExtraButton((button: ExtraButtonComponent) => this.createDeleteProfileButton(button));

        // Profile Name
        const profile = this.plugin.settings.profiles[this.selectedProfileId];
        new Setting(this.container)
            .setName("Profile name")
            .setDesc(`${profile.name} | Name of the profile`)
            .addText((text) => {
                text.setDisabled(isDefaultProfile(this.selectedProfileId));
                text.setValue(profile.name).onChange(async (value) => {
                    profile.name = value;
                    await this.plugin.saveSettings();
                });
            });

        // Provider Selection
        new Setting(this.container)
            .setName("AI provider")
            .setDesc(`${profile.name} | Choose your preferred AI provider`)
            .addDropdown((dropdown) => {
                dropdown
                    .addOption(ProviderType.OLLAMA, "Ollama")
                    .addOption(ProviderType.OPENAI, "OpenAI")
                    .addOption(ProviderType.OPENAI_COMPATIBLE, "OpenAI Compatible")
                    .setValue(profile.provider)
                    .onChange(async (value: ProviderType) => {
                        profile.provider = value;
                        await this.plugin.saveSettings();
                        await this.render();
                    });
            });

        // Model Selection
        new Setting(this.container)
            .setName("Model")
            .setDesc(`${profile.name} | Select the model to use for completions`)
            .addExtraButton((button) => {
                button
                    .setIcon("refresh-ccw")
                    .setTooltip("Update model list")
                    .onClick(async () => {
                        await this.plugin.providerFactory.updateModels(profile.provider);
                        await this.plugin.saveSettings();
                        await this.render();
                        new Notice("Model list updated");
                    });
            })
            .addDropdown(async (dropdown) => {
                const models = this.plugin.settings.providers[profile.provider].models;
                dropdown
                    .addOptions(Object.fromEntries(models.map((model) => [model, model])))
                    .setValue(profile.completionOptions.model)
                    .onChange(async (value) => {
                        profile.completionOptions.model = value;
                        await this.plugin.saveSettings();
                    });

            });

        // Temperature Setting
        new Setting(this.container)
            .setName("Temperature")
            .setDesc(`${profile.name} | Control the randomness of completions (0 = deterministic, 1 = creative)`)
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

        // Suggestion Delay
        new Setting(this.container)
            .setName("Suggestion delay")
            .setDesc(`${profile.name} | Delay in milliseconds before fetching suggestions`)
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

        // Split Strategy
        new Setting(this.container)
            .setName("Completion strategy")
            .setDesc(`${profile.name} | Choose how completions should be split and accepted`)
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
        new Setting(this.container)
            .setName("System prompt")
            .setDesc(`${profile.name} | Set system prompt`)
            .addTextArea((text) => {
                text.inputEl.addClass("inscribe-prompt-textarea");
                text.inputEl.rows = 7;
                text.setValue(profile.completionOptions.systemPrompt).onChange(
                    async (value) => {
                        profile.completionOptions.systemPrompt = value;
                        await this.plugin.saveSettings();
                    }
                );
            });
        // User Prompt
        new Setting(this.container)
            .setName("User prompt")
            .setDesc(`${profile.name} | User prompt template`)
            .addExtraButton((button) => {
                button
                    .setIcon("list")
                    .setTooltip("Insert mustache template variables")
                    .onClick(async () => {
                        const text =
                            profile.completionOptions.userPrompt +
                            "\n" +
                            TEMPLATE_VARIABLES;
                        profile.completionOptions.userPrompt = text;
                        await this.plugin.saveSettings();
                        await this.render();
                    });
            })
            .addTextArea((text) => {
                text.inputEl.addClass("inscribe-prompt-textarea");
                text.inputEl.rows = 7;
                text.setValue(profile.completionOptions.userPrompt).onChange(
                    async (value) => {
                        profile.completionOptions.userPrompt = value;
                        await this.plugin.saveSettings();
                    }
                );
            });
    }

    private profileDropdown(dropdown: DropdownComponent): void {
        Object.entries(this.plugin.settings.profiles).forEach(([id, profile]) => {
            dropdown.addOption(id, profile.name);
        });
        dropdown
            .setValue(this.selectedProfileId)
            .onChange(async (value) => {
                this.selectedProfileId = value;
                await this.render();
            });
    }

    private createNewProfileButton(button: ExtraButtonComponent): void {
        button
            .setIcon("plus")
            .setTooltip("Create new profile")
            .onClick(async () => {
                this.selectedProfileId = createProfile(this.plugin.settings);
                await this.plugin.saveSettings();
                await this.render();
                this.onProfileUpdate();
            });
    }

    private createDeleteProfileButton(button: ExtraButtonComponent): void {
        const isDefault = this.selectedProfileId === DEFAULT_PROFILE;
        button
            .setDisabled(isDefault)
            .setIcon("trash")
            .setTooltip(isDefault ? "Cannot delete default profile" : "Delete profile")
            .onClick(async () => {
                delete this.plugin.settings.profiles[this.selectedProfileId];
                this.selectedProfileId = DEFAULT_PROFILE;
                await this.plugin.saveSettings();
                await this.render();
                this.onProfileUpdate();
            });
    }
}

/* --------------------------------------------------------------------------
 * Path Configs Section
 * ------------------------------------------------------------------------ */
class PathConfigsSection {
    private container: HTMLElement;
    private plugin: Inscribe;
    private tableContainer: HTMLElement;

    constructor(container: HTMLElement, plugin: Inscribe) {
        this.container = container;
        this.plugin = plugin;
        this.tableContainer = document.createElement("div");
        this.tableContainer.addClass("setting-item");
    }

    async render(): Promise<void> {
        this.container.empty();

        // Heading
        new Setting(this.container)
            .setHeading()
            .setName("Per-Path profile assignments")
            .setDesc("You can assign profiles to paths. Paths are matched by prefix, with longer paths taking precedence. For example, '/Daily' will match all files in the Daily folder.");
        this.container.appendChild(this.tableContainer);
        await this.renderMappingsTable();
    }

    private async renderMappingsTable(): Promise<void> {
        this.tableContainer.empty();

        const table = this.tableContainer.createEl("table", { cls: "inscribe-mapping-table" });
        const header = table.createEl("tr");
        header.createEl("th", { text: "Path" });
        header.createEl("th", { text: "Profile" });
        header.createEl("th", { text: "" });
        header.createEl("th", { text: "" });

        // Add New Mapping Row
        const newRow = table.createEl("tr");
        let pathInput = "";
        let selectedProfile = DEFAULT_PROFILE;

        // Path input cell
        const pathCell = newRow.createEl("td");

        new TextComponent(pathCell)
            .setPlaceholder("Enter path (e.g., Daily/Work)")
            .onChange((value) => {
                pathInput = value;
            });

        // Profile dropdown cell
        const profileCell = newRow.createEl("td");
        const profileDropdown = new DropdownComponent(profileCell)
            .setValue(selectedProfile);

        Object.entries(this.plugin.settings.profiles).forEach(([id, profile]) => {
            profileDropdown.addOption(id, profile.name);
        });

        profileDropdown.onChange((value) => {
            selectedProfile = value;
        });

        // Add button cell
        newRow.createEl("td");
        const actionCell = newRow.createEl("td");
        new ButtonComponent(actionCell)
            .setIcon("plus")
            .setTooltip("Add profile mapping")
            .onClick(async () => {
                if (!pathInput) {
                    new Notice("Path cannot be empty");
                    return;
                }

                createPathConfig(this.plugin.settings, pathInput, selectedProfile);
                await this.plugin.saveSettings();
                await this.render();
            });

        // Existing Mappings
        Object.entries(this.plugin.settings.path_configs).forEach(([path, mapping]) => {
            const row = table.createEl("tr");
            const isDefaultMapping = path === DEFAULT_PATH;
            row.createEl("td", { text: isDefaultMapping ? "Default (all paths)" : path });

            // Create profile cell with dropdown
            const profileCell = row.createEl("td");

            // For other mappings, show editable dropdown
            const profileDropdown = new DropdownComponent(profileCell)
                .setDisabled(isDefaultMapping);

            // Add profile options
            Object.entries(this.plugin.settings.profiles).forEach(([id, profile]) => {
                profileDropdown.addOption(id, profile.name);
            });

            profileDropdown.setValue(mapping.profile);

            // Handle profile change
            profileDropdown.onChange(async (value) => {
                createPathConfig(this.plugin.settings, path, value);
                await this.plugin.saveSettings();
            });

            const deleteCell = row.createEl("td");
            new ExtraButtonComponent(deleteCell)
                .setIcon("trash")
                .setDisabled(isDefaultMapping)
                .setTooltip("Delete mapping")
                .onClick(async () => {
                    delete this.plugin.settings.path_configs[path];
                    await this.plugin.saveSettings();
                    await this.render();
                });

            // Add enabled checkbox cell
            const enabledCell = row.createEl("td");
            // Create a wrapper div for the toggle with flexbox centering
            const toggleWrapper = enabledCell.createDiv();
            toggleWrapper.addClass("mapping-toggle-wrapper");
            new ToggleComponent(toggleWrapper)
                .setTooltip("Enable/disable mapping")
                .setValue(mapping.enabled)
                .onChange(async (value: boolean) => {
                    this.plugin.settings.path_configs[path].enabled = value;
                    await this.plugin.saveSettings();
                    this.plugin.statusBarItem.render();
                });
        });
    }
}
