import { Plugin } from 'obsidian';
import { inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings/settings';
import InscribeSettingsTab from './settings/settings-tab';
import { ProviderFactory } from './providers/factory';
import { ProfileService } from './profile/service';
import { CompletionEngine } from './completion/engine';
import StatusBarItem from './statusbar/status-bar-item';

export default class Inscribe extends Plugin {
	settings: Settings;
	providerFactory: ProviderFactory;

	private profileTracker: ProfileService;
	private completionEngine: CompletionEngine;
	private statusBarItem: StatusBarItem;

	async onload() {
		await this.loadSettings();

		this.profileTracker = new ProfileService(this);
		this.providerFactory = new ProviderFactory(this);
		this.completionEngine = new CompletionEngine(this.app, this.profileTracker, this.providerFactory);
		this.statusBarItem = new StatusBarItem(this, this.profileTracker, this.completionEngine);

		this.addSettingTab(new InscribeSettingsTab(this));
		await this.setupExtension();
	}

	async onunload() {
		this.profileTracker.onunload();
	}

	async setupExtension() {
		const extension = inlineSuggestions({
			fetchFunc: () => this.completionEngine.fetchCompletion(),
			getOptions: () => this.profileTracker.getOptions()
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
		this.providerFactory.rebuildProviders();
	}
}