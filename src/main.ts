import { Plugin } from 'obsidian';
import { inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings/settings';
import InscribeSettingsTab from './settings/settings-tab';
import { CompletionManager } from './completion/manager';

export default class Inscribe extends Plugin {
	settings: Settings;
	completionManager: CompletionManager;

	async onload() {
		await this.loadSettings();
		await this.loadCompletionManager();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
	}

	async loadCompletionManager() {
		this.completionManager = new CompletionManager(this.app, this.settings);
	}

	async setupExtention() {
		const extension = inlineSuggestions({
			fetchFunc: () => this.completionManager.fetchSuggestions(),
			getOptions: () => this.completionManager.getOptions()
		});
		this.registerEditorExtension(extension);
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
		this.completionManager.loadProviders();
	}
}