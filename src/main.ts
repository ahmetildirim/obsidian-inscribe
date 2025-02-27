import { Notice, Plugin, setIcon, TFile, setTooltip } from 'obsidian';
import { inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings/settings';
import InscribeSettingsTab from './settings/settings-tab';
import { ProviderManager } from './providers/manager';
import { ProfileManager } from './profile/manager';

export default class Inscribe extends Plugin {
	settings: Settings;
	providerManager: ProviderManager;
	profileManager: ProfileManager;

	async onload() {
		await this.loadSettings();

		this.profileManager = new ProfileManager(this);
		this.providerManager = new ProviderManager(this, this.profileManager);

		this.addSettingTab(new InscribeSettingsTab(this));
		await this.setupExtension();
		this.registerEvents();
	}

	registerEvents() {
		// Update profile when a file is opened
		this.registerEvent(this.app.workspace.on('file-open', (file: TFile) => {
			this.profileManager.updateProfile(file.path);
		}));
	}

	async setupExtension() {
		const extension = inlineSuggestions({
			fetchFunc: () => this.providerManager.fetchSuggestions(),
			getOptions: () => this.profileManager.getOptions()
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