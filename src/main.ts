import { Notice, Plugin, setIcon, TFile, setTooltip } from 'obsidian';
import { inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings/settings';
import InscribeSettingsTab from './settings/settings-tab';
import { ProviderManager } from './providers/manager';

export default class Inscribe extends Plugin {
	settings: Settings;
	providerManager: ProviderManager;
	statusBarItem: HTMLElement;

	async onload() {
		await this.loadSettings();
		await this.setupProviderManager();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
		this.setupStatusBarItem();
		this.registerEvents();
	}

	setupStatusBarItem() {
		this.statusBarItem = this.addStatusBarItem();
		setIcon(this.statusBarItem, 'feather');
		setTooltip(this.statusBarItem, `Profile: ${this.providerManager.getActiveProfile().name}`, { placement: 'top' });
	}

	registerEvents() {
		this.registerEvent(this.app.workspace.on('file-open', (file: TFile) => {
			this.providerManager.updateProfile(file.path);
			setTooltip(this.statusBarItem, `Profile: ${this.providerManager.getActiveProfile().name}`, { placement: 'top' });
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