import { Editor, Plugin } from 'obsidian';
import { inlineSuggestion, Suggestion } from "codemirror-companion-extension";
import { Provider } from './providers/provider';
import { Settings, DEFAULT_SETTINGS, InscribeSettingsTab } from './settings/settings';
import { buildProviders } from './providers';

export default class Inscribe extends Plugin {
	settings: Settings;
	provider: Provider
	providers: Provider[]

	async onload() {
		await this.loadSettings();
		await this.buildProviders();
		await this.setupExtention();
		this.addSettingTab(new InscribeSettingsTab(this.app, this));
	}

	async buildProviders() {
		this.providers = buildProviders(this.settings);
		const selectedProvider = this.providers.find(provider => provider.integration === this.settings.provider);
		if (selectedProvider) {
			selectedProvider.loadCompleter();
			this.provider = selectedProvider;
		}
	}

	async setupExtention() {
		const extension = inlineSuggestion({
			fetchFn: () => this.generateSuggestions(),
			delay: 500,
			continue_suggesting: false,
			accept_shortcut: 'Tab',
		});
		this.registerEditorExtension(extension);
	}

	async *generateSuggestions(): AsyncGenerator<Suggestion, void, unknown> {
		let markdownFileInfo = this.app.workspace.activeEditor;
		if (!markdownFileInfo) return;

		const editor = markdownFileInfo.editor as Editor;
		const cursor = editor.getCursor();

		// If the current line is empty, don't suggest anything.
		const currentLine = editor.getLine(cursor.line);
		if (!currentLine.length) {
			yield {
				display_suggestion: "",
				complete_suggestion: "",
			};
			return;
		}

		// Only if the last character is a space or dot, suggest completions.
		const lastChar = currentLine[cursor.ch - 1];
		if (lastChar !== " ") {
			yield { display_suggestion: "", complete_suggestion: "" };
			return;
		}

		const afterCursor = editor.getRange(cursor,
			{ line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length });

		if (afterCursor.length > 0) {
			yield { display_suggestion: "", complete_suggestion: "" };
			return;
		}

		const beforeCursor = editor.getRange({ line: 0, ch: 0 }, cursor);

		this.provider.completer.abort();
		yield* this.provider.completer.generate(beforeCursor, afterCursor);
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
		await this.buildProviders();
		console.log(this.settings.providers.ollama.description);
	}
}
