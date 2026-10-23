import { Editor } from "obsidian";

// Internal CodeMirror shapes used for Vim detection (not part of the public API)
interface VimStateEditor {
    state: { field(field: unknown, require: boolean): { mode?: string } | undefined };
}

interface CodeMirrorWindow {
    CodeMirror: { Vim?: { vimStateField?: unknown } };
}

interface CodeMirrorAdapterEditor {
    cm?: { cm?: { state?: { keyMap?: string } } };
}

// Utility function to detect if Vim insert mode is active
export function isVimInsertMode(view: Editor): boolean {
    const vimStateField = (window as unknown as CodeMirrorWindow).CodeMirror.Vim?.vimStateField;
    const vim = (view as unknown as VimStateEditor).state.field(vimStateField, false);
    return vim ? vim.mode === 'insert' : false;
}

// Check if the editor is in Vim mode
export function isVimEnabled(editor: Editor): boolean {
    return (editor as unknown as CodeMirrorAdapterEditor)?.cm?.cm?.state?.keyMap === "vim";
}
