import { App } from "obsidian";

// Internal settings API (not part of the public API)
interface AppWithSetting {
    setting: { open(): void; openTabById(id: string): void };
}

// Opens the settings modal on the given tab, e.g. a plugin id or "hotkeys"
export function openSettingsTab(app: App, id: string): void {
    const setting = (app as unknown as AppWithSetting).setting;
    setting.open();
    setting.openTabById(id);
}
