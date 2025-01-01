import { TextFileView, MarkdownFileInfo, App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { forceableInlineSuggestion, Suggestion } from "codemirror-companion-extension";
import { Ollama, GenerateRequest, GenerateResponse } from "ollama";

export default class Inscribe extends Plugin {
	ollama : Ollama;

	async onload() {
		await this.setupSuggestions();
	}

	onunload() { }

	async setupSuggestions() {
		this.ollama = new Ollama({ host: 'http://127.0.0.1:11434' })

		const { extension, force_fetch } = forceableInlineSuggestion({
			fetchFn: () => this.fetchCompletion(),
			delay: 500,
			continue_suggesting: false,
			accept_shortcut: 'Tab',
		});

		this.registerEditorExtension(extension);
	}

	async *fetchCompletion(): AsyncGenerator<Suggestion, void, unknown> {
		console.log("fetching completion");

		let markdownFileInfo = this.app.workspace.activeEditor;
		if (!markdownFileInfo) return;

		const editor = markdownFileInfo.editor as Editor;
		const cursor = editor.getCursor();

		const currentLine = editor.getLine(cursor.line);
		if (!currentLine.length) {
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

		yield* this.complete(beforeCursor, afterCursor);
	}

	async* complete(prefix: string, suffix: string): AsyncGenerator<Suggestion> {
		const suggestions = this.fetchOllamaCompletion(prefix, suffix);
		yield* suggestions;
	}
	
	async* fetchOllamaCompletion(prefix: string, suffix: string): AsyncGenerator<Suggestion> {
		const promiseIterator = await this.ollama.generate({
			model: 'mistral-nemo',
			prompt: prefix,
			stream: true,
		});

		let completion = "";
		for await (let response of promiseIterator) {
			completion += response.response;
			yield { complete_suggestion: completion, display_suggestion: completion }
		}
	}
}
