import Inscribe from "src/main";
import { Provider, ProviderType } from "src/providers";
import { Settings } from "src/settings/settings";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";
import { OpenAICompatibleProvider } from "./openai-compat";
import { GeminiProvider } from "./gemini";
import { GrokProvider } from "./grok";

// The OpenAI and Gemini SDKs throw on an empty API key, so unset keys use a placeholder.
// Requests then fail with an authentication error instead of breaking plugin load.
const MISSING_API_KEY = "api-key-not-set";

interface Providers {
    [ProviderType.OLLAMA]: OllamaProvider,
    [ProviderType.OPENAI]: OpenAIProvider,
    [ProviderType.OPENAI_COMPATIBLE]: OpenAICompatibleProvider,
    [ProviderType.GEMINI]: GeminiProvider,
    [ProviderType.GROK]: GrokProvider,
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

    async fetchModels(provider: ProviderType): Promise<string[]> {
        return this.providers[provider].fetchModels();
    }

    async connectionTest(provider: ProviderType): Promise<boolean> {
        return this.providers[provider].connectionTest();
    }

    private buildProviders(settings: Settings): Providers {
        return {
            [ProviderType.OLLAMA]: new OllamaProvider(settings.providers.ollama),
            [ProviderType.OPENAI]: new OpenAIProvider(settings.providers.openai, this.getApiKey(settings.providers.openai.apiKeySecret)),
            [ProviderType.OPENAI_COMPATIBLE]: new OpenAICompatibleProvider(settings.providers.openai_compatible, this.getApiKey(settings.providers.openai_compatible.apiKeySecret)),
            [ProviderType.GEMINI]: new GeminiProvider(settings.providers.gemini, this.getApiKey(settings.providers.gemini.apiKeySecret)),
            [ProviderType.GROK]: new GrokProvider(settings.providers.grok, this.getApiKey(settings.providers.grok.apiKeySecret)),
        }
    }

    private getApiKey(secretId: string): string {
        const apiKey = secretId ? this.plugin.app.secretStorage.getSecret(secretId) : null;
        return apiKey || MISSING_API_KEY;
    }
}
