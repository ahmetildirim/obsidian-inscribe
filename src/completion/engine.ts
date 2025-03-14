import { ProfileManager } from "src/profile/manager";
import { ProviderManager } from "src/providers/manager";
export class CompletionEngine {
    constructor(
        private readonly profileManager: ProfileManager,
        private readonly providerManager: ProviderManager,
    ) { }
}
