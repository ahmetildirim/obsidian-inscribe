import { Plugin } from 'obsidian';
import { inlineSuggestion, Suggestion } from "codemirror-companion-extension";
import { Provider } from './providers/provider';
import { Settings, DEFAULT_SETTINGS, InscribeSettingsTab } from './settings/settings';
import { buildProviders } from './providers';
import { generateCompletion } from './completion';

export default class Inscribe extends Plugin {
	settings: Settings;
	provider: Provider
	providers: Provider[]

	async onload() {
		await this.loadSettings();
		await this.buildProviders();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
	}

	async buildProviders() {
		this.providers = buildProviders(this.settings);
		const selectedProvider = this.providers.find(provider => provider.integration === this.settings.provider);
		if (selectedProvider) {
			selectedProvider.loadCompleter();
			this.provider = selectedProvider;
		}
	}

	async setupExtention() {
		const extension = inlineSuggestion({
			fetchFn: () => this.fetchSuggestions(),
			delay: 100,
			continue_suggesting: false,
			accept_shortcut: 'Tab',
		});
		this.registerEditorExtension(extension);
	}

	async *fetchSuggestions(): AsyncGenerator<Suggestion, void, unknown> {
		console.log("triggered fetch");
		const fileInfo = this.app.workspace.activeEditor;
		if (!fileInfo) return;
		if (!fileInfo.editor) return;

		yield* generateCompletion(fileInfo.editor, this.provider.completer);
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
		await this.buildProviders();
	}
}