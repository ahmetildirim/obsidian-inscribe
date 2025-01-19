import { Plugin } from 'obsidian';
import { inlineSuggestion, Suggestion } from "codemirror-companion-extension";
import { Provider } from './providers/provider';
import { Settings, DEFAULT_SETTINGS, InscribeSettingsTab } from './settings/settings';
import { createProvider } from './providers';
import { generateCompletion } from './completion';

export default class Inscribe extends Plugin {
	settings: Settings;
	provider: Provider

	async onload() {
		await this.loadSettings();
		await this.buildProvider();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
	}

	async buildProvider() {
		this.provider = createProvider(this.settings);
	}

	async setupExtention() {
		const extension = inlineSuggestion({
			fetchFn: () => this.fetchSuggestions(),
			delay: 500,
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
		await this.buildProvider();
	}
}