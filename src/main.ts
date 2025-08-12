import { Plugin } from 'obsidian';
import { inlineSuggestions } from "./extension";
import { Settings, DEFAULT_SETTINGS } from './settings/settings';
import InscribeSettingsTab from './settings/tab';
import { ProviderFactory } from './providers/factory';
import { ProfileService } from './profile/service';
import CompletionService from './completions/service';
import StatusBarItem from './statusbar/statusbar';
import { deepMerge } from './settings/load';

export default class Inscribe extends Plugin {
	settings: Settings;
	providerFactory: ProviderFactory;
	statusBarItem: StatusBarItem;

	private profileService: ProfileService;
	private completionService: CompletionService;

	async onload() {
		await this.loadSettings();

		this.profileService = new ProfileService(this);
		this.providerFactory = new ProviderFactory(this);
		this.completionService = new CompletionService(this.app, this.settings, this.profileService, this.providerFactory);
		this.statusBarItem = new StatusBarItem(this, this.profileService, this.completionService);

		this.addSettingTab(new InscribeSettingsTab(this));
		await this.setupExtension();
	}

	async setupExtension() {
		const extension = inlineSuggestions({
			fetchFunc: () => this.completionService.fetchCompletion(),
			getOptions: () => this.profileService.getOptions(),
			acceptanceHotkey: this.settings.suggestionControl.acceptanceHotkey,
			triggerHotkey: this.settings.suggestionControl.manualActivationKey,
		});
		this.registerEditorExtension(extension);
	}

	async loadSettings() {
		const loadedSettings = await this.loadData() || {};

		this.settings = deepMerge(
			DEFAULT_SETTINGS,
			loadedSettings
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.providerFactory.rebuildProviders();
	}
}