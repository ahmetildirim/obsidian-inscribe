import Inscribe from "src/main";
import { Provider, Providers, ProviderType } from "src/providers";
import { Settings } from "src/settings/settings";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";

export class ProviderFactory {
    private settings: Settings;
    private providers: Providers;

    constructor(private plugin: Inscribe) {
        this.settings = this.plugin.settings;
        this.providers = buildProviders(this.settings);
    }

    rebuildProviders() {
        this.providers = buildProviders(this.settings);
    }

    getProvider(provider: ProviderType): Provider {
        return this.providers[provider];
    }

    async updateModels(provider: ProviderType): Promise<string[]> {
        return this.providers[provider].updateModels();
    }
}

const buildProviders = (settings: Settings): Providers => {
    return {
        [ProviderType.OLLAMA]: new OllamaProvider(settings.providers.ollama),
        [ProviderType.OPENAI]: new OpenAIProvider(settings.providers.openai),
    }
}