import { Plugin } from 'obsidian';
import { Suggestion, inlineSuggestion } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings';
import { InscribeSettingsTab } from "./settings";
import { buildCompleter, Completer } from './providers';
import { generateCompletion } from './completion';

export default class Inscribe extends Plugin {
	settings: Settings;
	completer: Completer

	async onload() {
		await this.loadSettings();
		await this.loadCompleter();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
	}

	async loadCompleter() {
		this.completer = buildCompleter(this.settings);
	}

	async setupExtention() {
		const extension = inlineSuggestion({
			fetchFn: () => this.fetchSuggestions(),
			delayMs: this.settings.delay_ms,
		});
		this.registerEditorExtension(extension);
	}

	async * fetchSuggestions(): AsyncGenerator<Suggestion> {
		const activeEditor = this.app.workspace.activeEditor;
		if (!activeEditor) return;
		if (!activeEditor.editor) return;

		yield* generateCompletion(activeEditor.editor, this.completer, this.settings.splitStrategy);
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
		await this.loadCompleter();
	}
}