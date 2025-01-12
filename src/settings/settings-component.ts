import Inscribe from "src/main";

export abstract class InscribeSettingsComponent {
    protected plugin: Inscribe;
    protected containerEl: HTMLElement;

    constructor(plugin: Inscribe, containerEl: HTMLElement) {
        this.plugin = plugin;
        this.containerEl = containerEl;
    }

    public abstract display(): void
}