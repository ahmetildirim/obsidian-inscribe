import Inscribe from "src/main";
import { Provider, ProviderType } from "src/providers";
import { Settings } from "src/settings/settings";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";
import { OpenAICompatibleProvider } from "./openai-compat";
import { GeminiProvider } from "./gemini";

interface Providers {
    [ProviderType.OLLAMA]: OllamaProvider,
    [ProviderType.OPENAI]: OpenAIProvider,
    [ProviderType.OPENAI_COMPATIBLE]: OpenAICompatibleProvider,
    [ProviderType.GEMINI]: GeminiProvider,
}

export class ProviderFactory {
    private settings: Settings;
    private providers: Providers;

    constructor(private plugin: Inscribe) {
        this.settings = this.plugin.settings;
        this.providers = this.buildProviders(this.settings);
    }

    rebuildProviders() {
        this.providers = this.buildProviders(this.settings);
    }

    getProvider(provider: ProviderType): Provider {
        return this.providers[provider];
    }

    async updateModels(provider: ProviderType): Promise<string[]> {
        return this.providers[provider].updateModels();
    }

    async connectionTest(provider: ProviderType): Promise<boolean> {
        return this.providers[provider].connectionTest();
    }

    private buildProviders(settings: Settings): Providers {
        return {
            [ProviderType.OLLAMA]: new OllamaProvider(settings.providers.ollama),
            [ProviderType.OPENAI]: new OpenAIProvider(settings.providers.openai),
            [ProviderType.OPENAI_COMPATIBLE]: new OpenAICompatibleProvider(settings.providers.openai_compatible),
            [ProviderType.GEMINI]: new GeminiProvider(settings.providers.gemini),
        }
    }
}