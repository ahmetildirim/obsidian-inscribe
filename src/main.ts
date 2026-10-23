import { editorInfoField, MarkdownFileInfo, MarkdownView, Notice, Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { inlineSuggestions, InlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS, SuggestionControl } from './settings/settings';
import InscribeSettingsTab from './settings/tab';
import { ProviderFactory } from './providers/factory';
import { ProfileService } from './profile/service';
import CompletionService from './completions/service';
import StatusBarItem from './statusbar/statusbar';
import { deepMerge } from './settings/load';

// Provider settings as stored by versions that kept API keys in data.json
type LegacyProviderSettings = { apiKey?: string, apiKeySecret?: string };
const LEGACY_DEFAULT_API_KEY = "api-key";
// Suggestion settings as stored by versions with in-page hotkey settings
type LegacySuggestionControl = Partial<SuggestionControl> & { acceptanceHotkey?: string, manualActivationKey?: string };

export default class Inscribe extends Plugin {
	settings!: Settings;
	providerFactory!: ProviderFactory;
	statusBarItem!: StatusBarItem;

	private profileService!: ProfileService;
	private completionService!: CompletionService;
	private suggestions!: InlineSuggestions;

	async onload() {
		await this.loadSettings();

		this.profileService = new ProfileService(this);
		this.providerFactory = new ProviderFactory(this);
		this.completionService = new CompletionService(this.app, this.settings, this.profileService, this.providerFactory);
		this.statusBarItem = new StatusBarItem(this, this.profileService, this.completionService);

		this.addSettingTab(new InscribeSettingsTab(this));
		this.setupExtension();
		this.registerCommands();
	}

	setupExtension() {
		this.suggestions = inlineSuggestions({
			fetchFunc: (_state, manual) => this.completionService.fetchCompletion(manual),
			getOptions: () => this.profileService.getOptions(),
		});
		this.registerEditorExtension(this.suggestions.extension);
	}

	registerCommands() {
		this.addCommand({
			id: "accept-suggestion",
			name: "Accept suggestion",
			editorCheckCallback: (checking, _editor, ctx) => {
				const view = this.findEditorView(ctx);
				if (!view || !this.suggestions.hasSuggestion(view)) return false;
				if (!checking) this.suggestions.accept(view);
				return true;
			},
		});
		this.addCommand({
			id: "trigger-suggestion",
			name: "Trigger suggestion",
			editorCheckCallback: (checking, _editor, ctx) => {
				const view = this.findEditorView(ctx);
				if (!view) return false;
				if (!checking) this.suggestions.trigger(view);
				return true;
			},
		});
	}

	// Find the CodeMirror view that belongs to a command's editor context
	private findEditorView(ctx: MarkdownView | MarkdownFileInfo): EditorView | undefined {
		for (const view of this.suggestions.views) {
			if (view.state.field(editorInfoField, false) === ctx) return view;
		}
		return undefined;
	}

	async loadSettings() {
		const loadedSettings = (await this.loadData() as Partial<Settings> | null) ?? {};
		const migratedApiKeys = this.migrateApiKeys(loadedSettings);
		const migratedHotkeys = this.migrateHotkeys(loadedSettings);

		this.settings = deepMerge(
			structuredClone(DEFAULT_SETTINGS),
			loadedSettings
		);

		if (migratedApiKeys || migratedHotkeys) await this.saveData(this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.providerFactory.rebuildProviders();
		this.profileService.refresh();
	}

	// Replace the in-page hotkey settings with commands bound in Settings → Hotkeys
	private migrateHotkeys(settings: Partial<Settings>): boolean {
		const control = settings.suggestionControl as LegacySuggestionControl | undefined;
		if (!control) return false;
		if (control.acceptanceHotkey === undefined && control.manualActivationKey === undefined) return false;

		const messages: string[] = [];
		if (control.manualActivationKey) {
			control.autoTrigger = false;
			messages.push(`Inscribe: to keep triggering suggestions with ${control.manualActivationKey}, bind "Trigger suggestion" in Settings → Hotkeys.`);
		}
		if (control.acceptanceHotkey && control.acceptanceHotkey !== "Tab") {
			messages.push(`Inscribe: Tab accepts suggestions. To also use ${control.acceptanceHotkey}, bind "Accept suggestion" in Settings → Hotkeys.`);
		}
		delete control.acceptanceHotkey;
		delete control.manualActivationKey;

		// Notices stay until dismissed
		this.app.workspace.onLayoutReady(() => messages.forEach((message) => new Notice(message, 0)));
		return true;
	}

	// Move API keys stored in data.json into Obsidian's secret storage
	private migrateApiKeys(settings: Partial<Settings>): boolean {
		const providers = settings.providers as Record<string, LegacyProviderSettings | undefined> | undefined;
		if (!providers) return false;

		let migrated = false;
		for (const [type, provider] of Object.entries(providers)) {
			if (!provider || provider.apiKey === undefined) continue;

			const apiKey = provider.apiKey;
			if (apiKey && apiKey !== LEGACY_DEFAULT_API_KEY && !provider.apiKeySecret) {
				const secretId = `inscribe-${type.replace(/_/g, "-")}-api-key`;
				try {
					this.app.secretStorage.setSecret(secretId, apiKey);
				} catch (error) {
					console.error(`Inscribe: failed to move the ${type} API key to secret storage`, error);
					continue;
				}
				// Keep the plain key unless it was stored successfully
				if (this.app.secretStorage.getSecret(secretId) !== apiKey) continue;
				provider.apiKeySecret = secretId;
			}

			delete provider.apiKey;
			migrated = true;
		}
		return migrated;
	}
}
