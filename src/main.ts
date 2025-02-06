import { Plugin } from 'obsidian';
import { Suggestion, inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS, Profile } from './settings';
import { InscribeSettingsTab } from "./settings";
import { buildCompleter, Completer } from './providers';
import { generateCompletion } from './completion';

export default class Inscribe extends Plugin {
	settings: Settings;
	profile: Profile;
	completer: Completer

	async onload() {
		await this.loadSettings();
		await this.loadCompleter();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
	}

	async loadCompleter() {
		this.completer = buildCompleter(this.profile);
	}

	async setupExtention() {
		const getOptions = () => {
			return {
				delayMs: this.profile.delay_ms,
				splitStrategy: this.profile.splitStrategy,
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

		yield* generateCompletion(activeEditor.editor, this.completer);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);

		this.profile = this.settings.profiles[this.settings.profile];
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.loadCompleter();
	}
}