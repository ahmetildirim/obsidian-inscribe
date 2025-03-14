import { Plugin, TFile } from 'obsidian';
import { inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings/settings';
import InscribeSettingsTab from './settings/settings-tab';
import { ProviderFactory } from './providers/factory';
import { ProfileTracker } from './profile/tracker';
import { CompletionEngine } from './completion/engine';

export default class Inscribe extends Plugin {
	settings: Settings;
	providerFactory: ProviderFactory;
	profileTracker: ProfileTracker;
	completionEngine: CompletionEngine;

	async onload() {
		await this.loadSettings();

		this.profileTracker = new ProfileTracker(this);
		this.providerFactory = new ProviderFactory(this);
		this.completionEngine = new CompletionEngine(this.app, this.profileTracker, this.providerFactory);

		this.addSettingTab(new InscribeSettingsTab(this));
		await this.setupExtension();
		this.registerEvents();
	}

	registerEvents() {
		// Update profile when a file is opened
		this.registerEvent(this.app.workspace.on('file-open', (file: TFile) => {
			this.profileTracker.updateProfile(file.path);
		}));
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