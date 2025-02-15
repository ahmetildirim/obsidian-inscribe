import { Plugin } from 'obsidian';
import { InlineCompletionOptions, Suggestion, inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS, Profile, DEFAULT_PROFILE } from './settings/settings';
import { InscribeSettingsTab } from "./settings/settings";
import { buildProviders, Providers } from './providers';
import { generateCompletion, resolveProfile } from './completion';

export default class Inscribe extends Plugin {
	settings: Settings;
	providers: Providers;
	inlineSuggestionOptions: InlineCompletionOptions = { delayMs: 300, splitStrategy: "sentence" };

	async onload() {
		await this.loadSettings();
		await this.loadProviders();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
	}

	async loadProviders() {
		this.providers = buildProviders(this.settings);
	}

	async setupExtention() {
		const getOptions = () => {
			return this.inlineSuggestionOptions;
		};

		const extension = inlineSuggestions({
			fetchFunc: () => this.fetchSuggestions(),
			getOptions: getOptions,
		});
		this.registerEditorExtension(extension);
	}

	async * fetchSuggestions(): AsyncGenerator<Suggestion> {
		const activeEditor = this.app.workspace.activeEditor;
		if (!activeEditor) return;
		if (!activeEditor.editor) return;

		const filePath = activeEditor.file?.path || '';
		const [provider, profile] = resolveProfile(this.settings, this.providers, filePath);
		this.inlineSuggestionOptions.delayMs = profile.delayMs;
		this.inlineSuggestionOptions.splitStrategy = profile.splitStrategy;
		yield* generateCompletion(activeEditor.editor, provider, profile.completionOptions);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.loadProviders();
	}
}