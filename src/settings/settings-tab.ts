import { App, PluginSettingTab, Setting, ButtonComponent, ExtraButtonComponent, DropdownComponent, TextComponent, ToggleComponent } from "obsidian";
import { TEMPLATE_VARIABLES } from "src/prompt/prompt";
import { SplitStrategy } from "src/extension";
import Inscribe from "src/main";
import { ProviderType } from "src/providers";
import { DEFAULT_PROFILE, newProfile, Profile } from "./settings";
import { ProviderSettingsModal } from './provider-settings-modal';

/* --------------------------------------------------------------------------
 * Main Settings Tab
 * ------------------------------------------------------------------------ */
export default class InscribeSettingsTab extends PluginSettingTab {
    private providersSection: ProvidersSection;
    private profilesSection: ProfilesSection;
    private pathMappingsSection: PathMappingsSection;

    constructor(private plugin: Inscribe) {
        super(plugin.app, plugin);
    }

    async display(): Promise<void> {
        this.containerEl.empty();

        // Providers Section
        const providersContainer = document.createElement("div");
        this.containerEl.appendChild(providersContainer);
        this.providersSection = new ProvidersSection(providersContainer, this.app, this.plugin);
        await this.providersSection.render();

        // Profiles Section
        const profilesContainer = document.createElement("div");
        this.containerEl.appendChild(profilesContainer);
        this.profilesSection = new ProfilesSection(profilesContainer, this.plugin);
        await this.profilesSection.render();

        // Path Mappings Section
        const pathMappingsContainer = document.createElement("div");
        this.containerEl.appendChild(pathMappingsContainer);
        this.pathMappingsSection = new PathMappingsSection(pathMappingsContainer, this.plugin);
        await this.pathMappingsSection.render();
    }
}

/* --------------------------------------------------------------------------
 * Providers Section
 * ------------------------------------------------------------------------ */
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
        this.container.createEl("h3", { text: "Providers" });
        this.container.createEl("p", {
            text: "Configure the AI providers you want to use for completions"
        });

        // Ollama Provider
        new Setting(this.container)
            .setName("Ollama")
            .setDesc("Local AI provider running on your machine")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText("Configure")
                    .setTooltip("Configure Ollama")
                    .onClick(() => this.openProviderModal(ProviderType.OLLAMA));
            });

        // OpenAI Provider
        new Setting(this.container)
            .setName("OpenAI")
            .setDesc("OpenAI API provider")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText("Configure")
                    .setTooltip("Configure OpenAI")
                    .onClick(() => this.openProviderModal(ProviderType.OPENAI));
            });
    }

    private openProviderModal(type: ProviderType): void {
        new ProviderSettingsModal(this.app, this.plugin, type).open();
    }
}

/* --------------------------------------------------------------------------
 * Profiles Section
 * ------------------------------------------------------------------------ */
class ProfilesSection {
    private container: HTMLElement;
    private plugin: Inscribe;
    private displayedProfileId: string = DEFAULT_PROFILE;
    private selectionContainer: HTMLElement;
    private profileContainer: HTMLElement;

    constructor(container: HTMLElement, plugin: Inscribe) {
        this.container = container;
        this.plugin = plugin;

        // Create the containers once
        this.selectionContainer = document.createElement("div");
        this.profileContainer = document.createElement("div");

        // Append them initially
        this.container.appendChild(this.selectionContainer);
        this.container.appendChild(this.profileContainer);
    }

    async render(): Promise<void> {
        // Clear main container and re-append sub-containers
        this.container.empty();
        this.container.createEl("h3", { text: "Profiles" });
        this.container.createEl("p", {
            text: "Configure the settings for each profile. A profile can be assigned to paths. The default profile is used when no profile is assigned."
        });
        this.container.appendChild(this.selectionContainer);
        this.container.appendChild(this.profileContainer);

        await this.renderProfileSelection();

        const displayedProfile = this.plugin.settings.profiles[this.displayedProfileId];
        await this.renderProfileSettings(displayedProfile);
    }

    private async renderProfileSelection(): Promise<void> {
        this.selectionContainer.empty();
        this.selectionContainer.createEl("br");

        new Setting(this.selectionContainer)
            .setHeading()
            .setName("Manage profile")
            .setDesc("Select a profile to configure its settings")
            .addDropdown((dropdown: DropdownComponent) => this.createProfileDropdown(dropdown))
            .addExtraButton((button: ExtraButtonComponent) => this.createNewProfileButton(button))
            .addExtraButton((button: ExtraButtonComponent) => this.createDeleteProfileButton(button));
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
                await this.render();
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
                await this.render();
            });
    }

    private async renderProfileSettings(profile: Profile): Promise<void> {
        this.profileContainer.empty();

        // Profile Name
        new Setting(this.profileContainer)
            .setName("Profile Name")
            .setDesc("Name of the profile")
            .addText((text) => {
                text.setValue(profile.name).onChange(async (value) => {
                    profile.name = value;
                    await this.plugin.saveSettings();
                });
            });

        // Provider Selection
        new Setting(this.profileContainer)
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
        new Setting(this.profileContainer)
            .setName("Model")
            .setDesc("Select the model to use for completions")
            .addExtraButton((button) => {
                button
                    .setIcon("refresh-ccw")
                    .setTooltip("Update model list")
                    .onClick(async () => {
                        this.plugin.providerFactory.updateModels(profile.provider);
                        await this.plugin.saveSettings();
                        await this.renderProfileSettings(profile);
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
        new Setting(this.profileContainer)
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

        // Suggestion Delay
        new Setting(this.profileContainer)
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

        // Split Strategy
        new Setting(this.profileContainer)
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
        new Setting(this.profileContainer)
            .setName("System Prompt")
            .setDesc("Set system prompt")
            .addTextArea((text) => {
                text.inputEl.rows = 3;
                text.inputEl.setCssStyles({
                    width: "100%",
                    resize: "vertical",
                    position: "relative"
                });
                text.setValue(profile.completionOptions.systemPrompt).onChange(
                    async (value) => {
                        profile.completionOptions.systemPrompt = value;
                        await this.plugin.saveSettings();
                    }
                );
            });

        // User Prompt
        new Setting(this.profileContainer)
            .setName("User Prompt")
            .setDesc("User prompt template")
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
                        await this.renderProfileSettings(profile);
                    });
            })
            .addTextArea((text) => {
                text.inputEl.rows = 3;
                text.inputEl.setCssStyles({
                    width: "100%",
                    resize: "vertical",
                    position: "relative"
                });
                text.setValue(profile.completionOptions.userPrompt).onChange(
                    async (value) => {
                        profile.completionOptions.userPrompt = value;
                        await this.plugin.saveSettings();
                    }
                );
            });
    }
}

/* --------------------------------------------------------------------------
 * Path Mappings Section
 * ------------------------------------------------------------------------ */
class PathMappingsSection {
    private container: HTMLElement;
    private plugin: Inscribe;
    private tableContainer: HTMLElement;

    constructor(container: HTMLElement, plugin: Inscribe) {
        this.container = container;
        this.plugin = plugin;
        this.tableContainer = document.createElement("div");
    }

    async render(): Promise<void> {
        this.container.empty();
        this.container.createEl("h3", { text: "Dynamic Profile Mapping" });
        this.container.createEl("p", {
            text: "You can assign profiles to paths. Paths are matched by prefix, with longer paths taking precedence. For example, '/Daily' will match all files in the Daily folder."
        });
        this.container.createEl("br");

        this.container.appendChild(this.tableContainer);
        await this.renderMappingsTable();
    }

    private async renderMappingsTable(): Promise<void> {
        this.tableContainer.empty();

        const table = this.tableContainer.createEl("table", { cls: "mapping-table" });
        const header = table.createEl("tr");
        header.createEl("th", { text: "Path" });
        header.createEl("th", { text: "Profile" });
        header.createEl("th", { text: "" });
        header.createEl("th", { text: "" });

        // Add New Mapping Row
        const newRow = table.createEl("tr", { cls: "new-mapping-row" });
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
        new ExtraButtonComponent(actionCell)
            .setIcon("plus")
            .setTooltip("Add profile mapping")
            .onClick(async () => {
                this.plugin.settings.path_profile_mappings[pathInput] = {
                    profile: selectedProfile,
                    enabled: true,
                };
                await this.plugin.saveSettings();
                await this.render();
            });

        // Existing Mappings
        Object.entries(this.plugin.settings.path_profile_mappings).forEach(([path, mapping]) => {
            const row = table.createEl("tr");
            row.createEl("td", { text: path || "Root" });

            // Create profile cell with dropdown
            const isDefaultMapping = path === "";
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
                this.plugin.settings.path_profile_mappings[path] = {
                    profile: value,
                    enabled: mapping.enabled,
                };
                await this.plugin.saveSettings();
            });

            const deleteCell = row.createEl("td");
            new ExtraButtonComponent(deleteCell)
                .setIcon("trash")
                .setDisabled(isDefaultMapping)
                .setTooltip("Delete mapping")
                .onClick(async () => {
                    delete this.plugin.settings.path_profile_mappings[path];
                    await this.plugin.saveSettings();
                    await this.render();
                });

            // Add enabled checkbox cell
            const enabledCell = row.createEl("td");
            new ToggleComponent(enabledCell)
                .setTooltip("Enable/disable mapping")
                .setValue(mapping.enabled)
                .onChange(async (value: boolean) => {
                    this.plugin.settings.path_profile_mappings[path].enabled = value;
                    await this.plugin.saveSettings();
                });
        });
    }
}
