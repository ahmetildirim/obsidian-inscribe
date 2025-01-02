import { Editor, Plugin } from 'obsidian';
import { forceableInlineSuggestion, Suggestion } from "codemirror-companion-extension";
import { Model } from './model';
import OllamaModel from './integrations/ollama/ollama';

export default class Inscribe extends Plugin {
	activeModel : Model

	async onload() {
		await this.loadModel();
		await this.setupSuggestions();
	}
	async loadModel() {
		this.activeModel = new OllamaModel();
		await this.activeModel.load();
	}

	onunload() { }

	async setupSuggestions() {
		const { extension, force_fetch } = forceableInlineSuggestion({
			fetchFn: () => this.generateSuggestions(),
			delay: 500,
			continue_suggesting: false,
			accept_shortcut: 'Tab',
		});

		this.registerEditorExtension(extension);
	}

	async *generateSuggestions(): AsyncGenerator<Suggestion, void, unknown> {
		console.log("fetching completion");

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
			yield {
				display_suggestion: "",
				complete_suggestion: "",
			};
			return;
		}

		const beforeCursor = editor.getRange({ line: 0, ch: 0 }, cursor);
		const afterCursor = editor.getRange(cursor,
			{
				line: editor.lastLine(),
				ch: editor.getLine(editor.lastLine()).length,
			});

		yield* this.activeModel.generate(beforeCursor, afterCursor);
	}
}
