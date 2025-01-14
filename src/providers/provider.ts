import Inscribe from "src/main";
import { Integration } from ".";
import { Completer } from "./completer";

// Provider interface for ai providers
export interface Provider {
    integration: Integration;
    settings: any
    completer: Completer;
    loadCompleter: () => Promise<void>;
    displaySettings: (
        plugin: Inscribe,
        containerEl: HTMLElement,
        display: () => Promise<void>) => void;
    availableModels(): Promise<string[]> | string[];
}