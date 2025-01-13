import Inscribe from "src/main";
import { Integration } from ".";
import { Completer } from "./completer";

// Provider interface for ai providers
export interface Provider {
    integration: Integration;
    name: string;
    description: string;
    settings: any
    completer: Completer;
    models: string[];
    loadCompleter: () => Promise<void>;
    displaySettings: (plugin: Inscribe, containerEl: HTMLElement) => void;
}