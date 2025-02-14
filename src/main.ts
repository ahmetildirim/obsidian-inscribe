import { Plugin } from 'obsidian';
import { Suggestion, inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS, Profile, DEFAULT_PROFILE } from './settings';
import { InscribeSettingsTab } from "./settings";
import { buildProviders, Providers } from './providers';
import { generateCompletion, resolveProfile } from './completion';

export default class Inscribe extends Plugin {
	settings: Settings;
	providers: Providers;

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
			return {
				delayMs: this.settings.profiles[DEFAULT_PROFILE].delayMs,
				splitStrategy: this.settings.profiles[DEFAULT_PROFILE].splitStrategy,
			};
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

		yield* generateCompletion(activeEditor.editor, ...resolveProfile(this.settings, this.providers));
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