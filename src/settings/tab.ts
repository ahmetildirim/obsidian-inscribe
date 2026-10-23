import {
    AbstractInputSuggest,
    App,
    Modal,
    Notice,
    PluginSettingTab,
    Setting,
    SettingDefinition,
    SettingDefinitionGroup,
    SettingDefinitionItem,
    SettingDefinitionList,
    SettingDefinitionPage,
    SettingGroupItem,
    TFolder,
} from "obsidian";
import { TEMPLATE_VARIABLES } from "src/completions/prompt";
import { openSettingsTab } from "src/internal";
import Inscribe from "src/main";
import { ProviderType } from "src/providers";
import { isObject } from "./load";
import { createPathConfig, createProfile, DEFAULT_PATH, DEFAULT_PROFILE, deleteProfile, isDefaultProfile, resetSettings, Settings } from "./settings";

// Display order and names of the providers
const PROVIDER_NAMES: Record<ProviderType, string> = {
    [ProviderType.OLLAMA]: "Ollama",
    [ProviderType.OPENAI]: "OpenAI",
    [ProviderType.GEMINI]: "Gemini",
    [ProviderType.GROK]: "Grok",
    [ProviderType.OPENAI_COMPATIBLE]: "OpenAI compatible",
};

const PROVIDER_DESCRIPTIONS: Record<ProviderType, string> = {
    [ProviderType.OLLAMA]: "Local models running on your machine",
    [ProviderType.OPENAI]: "OpenAI API",
    [ProviderType.GEMINI]: "Google Gemini API",
    [ProviderType.GROK]: "xAI Grok API",
    [ProviderType.OPENAI_COMPATIBLE]: "Any API that follows the OpenAI format",
};

const TEMPLATE_VARIABLE_DESCRIPTIONS: Record<string, string> = {
    pre_cursor: "text before the cursor",
    post_cursor: "text after the cursor",
    active_sentence: "the current sentence",
    last_line: "the last line of the note",
};

// Settings edited as JSON text in textarea controls
const JSON_FIELDS = new Set(["models", "extraParams"]);

// Control keys are JSON arrays of property names, so paths with dots or slashes work as keys
function key(...path: string[]): string {
    return JSON.stringify(path);
}

function parseKey(controlKey: string): string[] {
    const path: unknown = JSON.parse(controlKey);
    if (!Array.isArray(path) || !path.every((part) => typeof part === "string")) {
        throw new Error(`Invalid setting key: ${controlKey}`);
    }
    return path;
}

export default class InscribeSettingsTab extends PluginSettingTab {
    icon = "feather";

    constructor(private plugin: Inscribe) {
        super(plugin.app, plugin);
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        return [
            {
                name: "Enabled",
                desc: "Show AI suggestions while you write",
                control: { type: "toggle", key: key("enabled") },
            },
            this.suggestionsGroup(),
            this.autoTriggerGroup(),
            this.providersGroup(),
            this.profilesList(),
            this.pathConfigsList(),
            this.advancedGroup(),
        ];
    }

    getControlValue(controlKey: string): unknown {
        const path = parseKey(controlKey);
        const value = path.reduce<unknown>((obj, part) => isObject(obj) ? obj[part] : undefined, this.settings);
        return JSON_FIELDS.has(path[path.length - 1]) ? JSON.stringify(value, null, 2) : value;
    }

    async setControlValue(controlKey: string, value: unknown): Promise<void> {
        const path = parseKey(controlKey);
        const field = path.pop();
        const parent = path.reduce<unknown>((obj, part) => isObject(obj) ? obj[part] : undefined, this.settings);
        if (!field || !isObject(parent)) return;

        parent[field] = JSON_FIELDS.has(field) && typeof value === "string" ? JSON.parse(value) : value;
        await this.plugin.saveSettings();

        if (path[0] === undefined || path[0] === "path_configs") this.plugin.statusBarItem.render();
        // The provider decides which models and temperatures a profile offers
        if (field === "provider") this.update();
    }

    hide(): void {
        super.hide();
        // Pick up API keys edited in secret storage
        this.plugin.providerFactory.rebuildProviders();
    }

    private get settings(): Settings {
        return this.plugin.settings;
    }

    private suggestionsGroup(): SettingDefinitionGroup {
        const control = () => this.settings.suggestionControl;
        return {
            type: "group",
            heading: "Suggestions",
            items: [
                {
                    name: "Show suggestions automatically",
                    desc: "Suggest as you type. When off, suggestions only appear when you run the Trigger suggestion command.",
                    control: { type: "toggle", key: key("suggestionControl", "autoTrigger") },
                },
                {
                    name: "Delay",
                    desc: "Milliseconds to wait after you stop typing before suggesting",
                    control: {
                        type: "number",
                        key: key("suggestionControl", "delayMs"),
                        placeholder: "500",
                        min: 0,
                        disabled: () => !control().autoTrigger,
                    },
                },
                {
                    name: "Accept",
                    desc: "How much of a suggestion Tab accepts at a time",
                    control: {
                        type: "dropdown",
                        key: key("suggestionControl", "splitStrategy"),
                        options: {
                            word: "Word by word",
                            sentence: "Sentence by sentence",
                            paragraph: "Paragraph by paragraph",
                            full: "Whole suggestion",
                        },
                    },
                },
                {
                    name: "Limit length",
                    desc: "Cut suggestions off after a number of sentences",
                    control: { type: "toggle", key: key("suggestionControl", "outputLimit", "enabled") },
                },
                {
                    name: "Maximum sentences",
                    desc: "Number of sentences to keep when the length is limited",
                    control: {
                        type: "number",
                        key: key("suggestionControl", "outputLimit", "sentences"),
                        min: 1,
                        step: 1,
                        validate: (value) => value >= 1 ? undefined : "Must be at least 1",
                        disabled: () => !control().outputLimit.enabled,
                    },
                },
                buttonSetting(
                    "Hotkeys",
                    "Tab accepts suggestions. Bind other keys to the Accept suggestion and Trigger suggestion commands.",
                    "Open hotkeys",
                    () => openSettingsTab(this.app, "hotkeys"),
                ),
            ],
        };
    }

    private autoTriggerGroup(): SettingDefinitionGroup {
        return {
            type: "group",
            heading: "Auto trigger rules",
            visible: () => this.settings.suggestionControl.autoTrigger,
            items: [
                {
                    name: "Require non-empty line",
                    desc: "Only suggest when the current line has content",
                    control: { type: "toggle", key: key("suggestionControl", "activationRules", "requireNonEmptyLine") },
                },
                {
                    name: "Require cursor not at start",
                    desc: "Don’t suggest when the cursor is at the start of a line",
                    control: { type: "toggle", key: key("suggestionControl", "activationRules", "requireCursorNotAtStart") },
                },
                {
                    name: "Require space before cursor",
                    desc: "Only suggest if there’s a space right before the cursor",
                    control: { type: "toggle", key: key("suggestionControl", "activationRules", "requireSpaceBeforeCursor") },
                },
            ],
        };
    }

    private providersGroup(): SettingDefinitionGroup {
        const types = Object.keys(PROVIDER_NAMES) as ProviderType[];
        return {
            type: "group",
            heading: "Providers",
            items: types.map((type) => this.providerPage(type)),
        };
    }

    private providerPage(type: ProviderType): SettingDefinitionPage {
        const items: SettingGroupItem[] = [];

        if (type === ProviderType.OLLAMA) {
            items.push({
                name: "Host",
                desc: "Address of your Ollama server",
                control: { type: "text", key: key("providers", type, "host"), placeholder: "http://localhost:11434" },
            });
        } else {
            items.push({
                name: "API key",
                desc: `Secret that holds your ${PROVIDER_NAMES[type]} API key`,
                control: { type: "secret", key: key("providers", type, "apiKeySecret") },
            });
        }

        if (type === ProviderType.OPENAI_COMPATIBLE) {
            items.push(
                {
                    name: "Base URL",
                    desc: "Address of the API",
                    control: { type: "text", key: key("providers", type, "baseUrl"), placeholder: "https://api.openai.com/v1" },
                },
                {
                    name: "Extra parameters",
                    desc: "JSON object sent with every request, e.g. {\"chat_template_kwargs\": {\"enable_thinking\": false}}",
                    control: { type: "textarea", key: key("providers", type, "extraParams"), rows: 4, placeholder: "{}", validate: validateJsonObject },
                },
            );
        }

        items.push(
            buttonSetting(
                "Connection",
                "Check that the provider is reachable with these settings",
                "Test",
                () => void this.testConnection(type),
            ),
            buttonSetting(
                "Refresh models",
                "Load the list of models from the provider",
                "Refresh",
                () => void this.refreshModels(type),
            ),
            {
                name: "Models",
                desc: "JSON list of the models that profiles can use",
                control: { type: "textarea", key: key("providers", type, "models"), rows: 6, validate: validateModels },
            },
        );

        return {
            type: "page",
            name: PROVIDER_NAMES[type],
            desc: PROVIDER_DESCRIPTIONS[type],
            displayValue: () => this.settings.providers[type].configured ? "Connected" : "Not connected",
            status: () => this.settings.providers[type].configured ? null : "warning",
            items,
        };
    }

    private profilesList(): SettingDefinitionList {
        const ids = Object.keys(this.settings.profiles)
            .sort((a, b) => Number(isDefaultProfile(b)) - Number(isDefaultProfile(a)));
        return {
            type: "list",
            heading: "Profiles",
            addItem: { name: "New profile", action: () => void this.addProfile() },
            onDelete: (index) => void this.removeProfile(ids[index]),
            items: ids.map((id) => this.profilePage(id)),
        };
    }

    private profilePage(id: string): SettingDefinitionPage {
        const profile = this.settings.profiles[id];
        const provider = this.settings.providers[profile.provider];
        const models = [...new Set([...provider.models, profile.completionOptions.model])];

        return {
            type: "page",
            name: profile.name,
            displayValue: () => {
                const current = this.settings.profiles[id];
                return current ? `${PROVIDER_NAMES[current.provider]} · ${current.completionOptions.model}` : "";
            },
            items: [
                {
                    name: "Name",
                    desc: isDefaultProfile(id) ? "The default profile can't be renamed" : undefined,
                    control: {
                        type: "text",
                        key: key("profiles", id, "name"),
                        disabled: isDefaultProfile(id),
                        validate: (value) => this.validateProfileName(id, value),
                    },
                },
                {
                    name: "Provider",
                    control: { type: "dropdown", key: key("profiles", id, "provider"), options: PROVIDER_NAMES },
                },
                {
                    name: "Model",
                    desc: "Missing a model? Refresh the provider's models.",
                    control: {
                        type: "dropdown",
                        key: key("profiles", id, "completionOptions", "model"),
                        options: Object.fromEntries(models.map((model) => [model, model])),
                    },
                },
                {
                    name: "Temperature",
                    desc: "Lower is more predictable, higher is more creative",
                    control: {
                        type: "slider",
                        key: key("profiles", id, "completionOptions", "temperature"),
                        min: provider.temperature_range.min,
                        max: provider.temperature_range.max,
                        step: 0.1,
                    },
                },
                {
                    name: "System prompt",
                    desc: "Instructions that set how the model writes",
                    control: { type: "textarea", key: key("profiles", id, "completionOptions", "systemPrompt"), rows: 6 },
                },
                {
                    name: "User prompt",
                    desc: templateVariablesDescription(),
                    control: { type: "textarea", key: key("profiles", id, "completionOptions", "userPrompt"), rows: 6 },
                },
                buttonSetting(
                    "Insert all variables",
                    "Append every template variable to the user prompt",
                    "Insert",
                    () => void this.insertTemplateVariables(id),
                ),
            ],
        };
    }

    private pathConfigsList(): SettingDefinitionList {
        const paths = Object.keys(this.settings.path_configs)
            .sort((a, b) => Number(b === DEFAULT_PATH) - Number(a === DEFAULT_PATH));
        return {
            type: "list",
            heading: "Per-path profiles",
            addItem: {
                name: "Add path",
                action: () => new PathConfigModal(this.app, this.plugin, () => this.update()).open(),
            },
            onDelete: (index) => void this.removePathConfig(paths[index]),
            items: paths.map((path) => this.pathConfigPage(path)),
        };
    }

    private pathConfigPage(path: string): SettingDefinitionPage {
        const isDefault = path === DEFAULT_PATH;
        return {
            type: "page",
            name: isDefault ? "All other notes" : path,
            desc: isDefault ? "Used when no other path matches" : undefined,
            displayValue: () => {
                const pathConfig = this.settings.path_configs[path];
                if (!pathConfig) return "";
                return pathConfig.enabled ? this.settings.profiles[pathConfig.profile]?.name ?? "" : "Off";
            },
            items: [
                {
                    name: "Profile",
                    desc: isDefault ? "Profile for notes that match no other path" : "Profile for notes in this path",
                    control: { type: "dropdown", key: key("path_configs", path, "profile"), options: profileOptions(this.settings) },
                },
                {
                    name: "Suggestions",
                    desc: isDefault ? "Show suggestions in notes that match no other path" : "Show suggestions in notes in this path",
                    control: { type: "toggle", key: key("path_configs", path, "enabled") },
                },
            ],
        };
    }

    private advancedGroup(): SettingDefinitionGroup {
        return {
            type: "group",
            heading: "Advanced",
            items: [
                buttonSetting(
                    "Reset settings",
                    "Restore all settings to their defaults. API keys stay in secret storage.",
                    "Reset",
                    () => new ConfirmModal(
                        this.app,
                        "Reset settings?",
                        "All Inscribe settings, profiles and path assignments will be restored to their defaults.",
                        "Reset",
                        () => void this.resetSettings(),
                    ).open(),
                    true,
                ),
            ],
        };
    }

    private validateProfileName(id: string, value: string): string | undefined {
        const name = value.trim();
        if (!name) return "Name can't be empty";
        const taken = Object.entries(this.settings.profiles).some(([otherId, profile]) => otherId !== id && profile.name === name);
        return taken ? "Another profile has this name" : undefined;
    }

    private async refreshModels(type: ProviderType): Promise<void> {
        try {
            this.settings.providers[type].models = await this.plugin.providerFactory.fetchModels(type);
        } catch (error) {
            console.error("Error fetching models:", error);
            new Notice("Failed to fetch models");
            return;
        }
        await this.plugin.saveSettings();
        new Notice("Models refreshed");
        this.update();
    }

    private async testConnection(type: ProviderType): Promise<void> {
        new Notice("Testing connection…");
        const provider = this.settings.providers[type];
        provider.configured = await this.plugin.providerFactory.connectionTest(type);
        await this.plugin.saveSettings();
        new Notice(provider.configured ? "Connected!" : "Failed to connect");
        this.update();
    }

    private async addProfile(): Promise<void> {
        createProfile(this.settings);
        await this.plugin.saveSettings();
        this.update();
    }

    private async removeProfile(id: string): Promise<void> {
        if (isDefaultProfile(id)) {
            new Notice("The default profile can't be deleted");
        } else {
            deleteProfile(this.settings, id);
            await this.plugin.saveSettings();
        }
        this.update();
    }

    private async removePathConfig(path: string): Promise<void> {
        if (path === DEFAULT_PATH) {
            new Notice("The default path can't be deleted");
        } else {
            delete this.settings.path_configs[path];
            await this.plugin.saveSettings();
            this.plugin.statusBarItem.render();
        }
        this.update();
    }

    private async insertTemplateVariables(id: string): Promise<void> {
        const options = this.settings.profiles[id].completionOptions;
        options.userPrompt = `${options.userPrompt}\n${TEMPLATE_VARIABLES}`;
        await this.plugin.saveSettings();
        this.update();
    }

    private async resetSettings(): Promise<void> {
        resetSettings(this.settings);
        await this.plugin.saveSettings();
        this.plugin.statusBarItem.render();
        this.update();
        new Notice("Settings reset to defaults");
    }
}

class PathConfigModal extends Modal {
    private path = "";
    private profile = DEFAULT_PROFILE;

    constructor(app: App, private plugin: Inscribe, private onSave: () => void) {
        super(app);
    }

    onOpen() {
        this.setTitle("Add path");

        new Setting(this.contentEl)
            .setName("Path")
            .setDesc("Notes whose path starts with this use the profile. Longer paths take precedence.")
            .addText((text) => {
                text.setPlaceholder("Folder path").onChange((value) => this.path = value.trim());
                new FolderSuggest(this.app, text.inputEl).onSelect((folder) => {
                    text.setValue(folder.path);
                    this.path = folder.path;
                });
            });

        new Setting(this.contentEl)
            .setName("Profile")
            .addDropdown((dropdown) => dropdown
                .addOptions(profileOptions(this.plugin.settings))
                .setValue(this.profile)
                .onChange((value) => this.profile = value));

        new Setting(this.contentEl)
            .addButton((button) => button
                .setButtonText("Cancel")
                .onClick(() => this.close()))
            .addButton((button) => button
                .setCta()
                .setButtonText("Add")
                .onClick(() => void this.save()));
    }

    onClose() {
        this.contentEl.empty();
    }

    private async save(): Promise<void> {
        if (!this.path) {
            new Notice("Path can't be empty");
            return;
        }
        if (this.plugin.settings.path_configs[this.path]) {
            new Notice("This path already has a profile");
            return;
        }
        createPathConfig(this.plugin.settings, this.path, this.profile);
        await this.plugin.saveSettings();
        this.plugin.statusBarItem.render();
        this.close();
        this.onSave();
    }
}

class ConfirmModal extends Modal {
    constructor(app: App, title: string, message: string, confirmText: string, onConfirm: () => void) {
        super(app);
        this.setTitle(title);
        this.setContent(message);
        new Setting(this.contentEl)
            .addButton((button) => button
                .setButtonText("Cancel")
                .onClick(() => this.close()))
            .addButton((button) => button
                .setDestructive()
                .setButtonText(confirmText)
                .onClick(() => {
                    this.close();
                    onConfirm();
                }));
    }
}

class FolderSuggest extends AbstractInputSuggest<TFolder> {
    protected getSuggestions(query: string): TFolder[] {
        const lowerQuery = query.toLowerCase();
        return this.app.vault.getAllFolders(false)
            .filter((folder) => folder.path.toLowerCase().includes(lowerQuery));
    }

    renderSuggestion(folder: TFolder, el: HTMLElement): void {
        el.setText(folder.path);
    }
}

// A row with a regular button; `action` definitions render as link-styled rows
function buttonSetting(name: string, desc: string, buttonText: string, onClick: () => void, destructive = false): SettingDefinition {
    return {
        name,
        desc,
        render: (setting) => {
            setting.addButton((button) => {
                button.setButtonText(buttonText).onClick(onClick);
                if (destructive) button.setDestructive();
            });
        },
    };
}

function templateVariablesDescription(): DocumentFragment {
    return createFragment((fragment) => {
        fragment.appendText("Template for the request. Variables:");
        const list = fragment.createEl("ul");
        for (const [name, description] of Object.entries(TEMPLATE_VARIABLE_DESCRIPTIONS)) {
            const item = list.createEl("li");
            item.createEl("code", { text: `{{${name}}}` });
            item.appendText(` ${description}`);
        }
    });
}

function profileOptions(settings: Settings): Record<string, string> {
    return Object.fromEntries(Object.entries(settings.profiles).map(([id, profile]) => [id, profile.name]));
}

function validateModels(value: string): string | undefined {
    try {
        const models: unknown = JSON.parse(value);
        if (Array.isArray(models) && models.every((model) => typeof model === "string")) return undefined;
    } catch {
        return "Invalid JSON";
    }
    return "Must be a JSON list of model names";
}

function validateJsonObject(value: string): string | undefined {
    try {
        return isObject(JSON.parse(value)) ? undefined : "Must be a JSON object";
    } catch {
        return "Invalid JSON";
    }
}
