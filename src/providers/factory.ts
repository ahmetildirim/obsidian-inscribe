import Inscribe from "src/main";
import { buildProviders, Provider, Providers, ProviderType } from "src/providers";
import { Settings } from "src/settings/settings";

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