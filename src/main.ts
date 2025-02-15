import { Plugin } from 'obsidian';
import { inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings/settings';
import InscribeSettingsTab from './settings/settings-tab';
import { ProviderManager } from './providers/manager';

export default class Inscribe extends Plugin {
	settings: Settings;
	providerManager: ProviderManager;

	async onload() {
		await this.loadSettings();
		await this.loadProviderManager();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
	}

	async loadProviderManager() {
		this.providerManager = new ProviderManager(this.app, this.settings);
	}

	async setupExtention() {
		const extension = inlineSuggestions({
			fetchFunc: () => this.providerManager.fetchSuggestions(),
			getOptions: () => this.providerManager.getOptions()
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
		this.providerManager.loadProviders();
	}
}