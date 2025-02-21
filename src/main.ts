import { Notice, Plugin, setIcon, TFile, setTooltip } from 'obsidian';
import { inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings/settings';
import InscribeSettingsTab from './settings/settings-tab';
import { ProviderManager } from './providers/manager';
import StatusBarItem from './statusbar/status-bar-item';
export default class Inscribe extends Plugin {
	settings: Settings;
	providerManager: ProviderManager;
	statusBarComponent: StatusBarItem;

	async onload() {
		await this.loadSettings();
		await this.setupProviderManager();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this));
		this.statusBarComponent = new StatusBarItem(this);
		this.registerEvents();
	}

	registerEvents() {
		// Update profile when a file is opened
		this.registerEvent(this.app.workspace.on('file-open', (file: TFile) => {
			this.providerManager.updateProfile(file.path);
			this.statusBarComponent.update();
		}));
	}

	async setupProviderManager() {
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