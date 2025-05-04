import { Editor } from "obsidian";

// Utility function to detect if Vim insert mode is active
export function isVimInsertMode(view: Editor): boolean {
    const vim = (view as any).state.field((window as any).CodeMirror.Vim?.vimStateField, false);
    return vim ? vim.mode === 'insert' : false;
}

// Check if the editor is in Vim mode
export function isVimEnabled(editor: Editor): boolean {
    return (editor as any)?.cm?.cm?.state?.keyMap === "vim";
}