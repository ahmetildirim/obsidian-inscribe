import Inscribe from "src/main";
import { Integration } from ".";
import { Completer } from "./completer";

// Provider interface for ai providers
export interface Provider {
    integration: Integration;
    settings: any
    completer: Completer;
    availableModels(): Promise<string[]> | string[];
}