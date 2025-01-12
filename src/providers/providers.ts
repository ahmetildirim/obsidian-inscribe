import { Settings } from "src/settings/settings";
import { Provider, ProviderId } from "./provider";
import { OllamaProvider } from "./ollama";

// builder function for providers
export const buildProviders = (settings: Settings): Provider[] => {
    return [
        new OllamaProvider(settings.providerSettings.ollama),
        // new OpenAIProvider(settings.providerSettings.openai),
    ];
}