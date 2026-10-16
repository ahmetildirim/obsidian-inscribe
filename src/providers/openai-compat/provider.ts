import { Provider } from "..";
import { Editor, requestUrl } from "obsidian";
import { OpenAICompatibleSettings } from ".";
import { ProfileOptions } from "src/settings/settings";

// Uses Obsidian's requestUrl() rather than the OpenAI SDK's fetch path so the
// plugin can reach endpoints that don't enable browser CORS (notably
// Anthropic's OpenAI-compatibility layer at https://api.anthropic.com/v1/).
// Tradeoff: requestUrl() does not stream, so completions arrive as a single
// buffered response. The Provider interface yields cumulative strings, so one
// final yield is interface-compatible with the streaming providers.
export class OpenAICompatibleProvider implements Provider {
    settings: OpenAICompatibleSettings;
    aborted: boolean = false;

    constructor(settings: OpenAICompatibleSettings) {
        this.settings = settings;
    }

    async *generate(editor: Editor, prompt: string, options: ProfileOptions): AsyncGenerator<string> {
        this.aborted = false;
        const initialPosition = editor.getCursor();

        const response = await requestUrl({
            url: this.endpoint("chat/completions"),
            method: "POST",
            contentType: "application/json",
            headers: this.authHeaders(),
            body: JSON.stringify({
                model: options.model,
                messages: [
                    { role: "system", content: options.systemPrompt },
                    { role: "user", content: prompt },
                ],
                temperature: options.temperature,
                ...this.settings.extraParams,
                // requestUrl() cannot consume SSE streams, so stream:false
                // must win against any extraParams override.
                stream: false,
            }),
            throw: false,
        });

        if (this.aborted || this.cursorMoved(editor, initialPosition)) {
            return;
        }

        if (response.status < 200 || response.status >= 300) {
            console.error("Inscribe: openai-compat request failed", response.status, response.text);
            return;
        }

        const completion = response.json?.choices?.[0]?.message?.content ?? "";
        if (completion) {
            yield completion;
        }
    }

    async abort() {
        // requestUrl() responses are buffered; the in-flight request cannot
        // be cancelled. Flag the abort so any yield after the response
        // returns is skipped.
        this.aborted = true;
    }

    async fetchModels(): Promise<string[]> {
        try {
            const response = await requestUrl({
                url: this.endpoint("models"),
                method: "GET",
                headers: this.authHeaders(),
                throw: false,
            });
            if (response.status >= 200 && response.status < 300 && Array.isArray(response.json?.data)) {
                return response.json.data.map((m: { id: string }) => m.id);
            }
        } catch (error) {
            console.error("Inscribe: openai-compat fetchModels failed", error);
        }
        // Many OpenAI-compatible endpoints (Anthropic, some self-hosted
        // runtimes) don't implement /v1/models. Fall back to the user's
        // configured list so the model picker isn't empty.
        return this.settings.models;
    }

    async connectionTest(): Promise<boolean> {
        if (!this.settings.baseUrl || !this.settings.apiKey) {
            return false;
        }
        // connectionTest runs before fetchModels has populated the model
        // list, so models[0] may be undefined. Fall back to a placeholder —
        // a 4xx "model not found" still proves baseUrl + apiKey reach a
        // working chat/completions endpoint.
        const model = this.settings.models[0] ?? "inscribe-connection-test";

        try {
            const response = await requestUrl({
                url: this.endpoint("chat/completions"),
                method: "POST",
                contentType: "application/json",
                headers: this.authHeaders(),
                body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 1,
                }),
                throw: false,
            });
            // 401/403 = auth failure (real problem). 5xx = transient/unreachable.
            // Anything else (200s, or a 400 "model not found") proves the
            // endpoint is reachable and the credentials work.
            if (response.status === 401 || response.status === 403) {
                console.error("Inscribe: openai-compat connection test auth failure", response.status, response.text);
                return false;
            }
            if (response.status >= 200 && response.status < 500) {
                return true;
            }
            console.error("Inscribe: openai-compat connection test failed", response.status, response.text);
            return false;
        } catch (error) {
            console.error("Inscribe: openai-compat connection test error", error);
            return false;
        }
    }

    private endpoint(path: string): string {
        const base = this.settings.baseUrl.endsWith("/") ? this.settings.baseUrl : `${this.settings.baseUrl}/`;
        return base + (path.startsWith("/") ? path.slice(1) : path);
    }

    private authHeaders(): Record<string, string> {
        return { "Authorization": `Bearer ${this.settings.apiKey}` };
    }

    private cursorMoved(editor: Editor, initialPosition: { line: number, ch: number }): boolean {
        const currentPosition = editor.getCursor();
        return currentPosition.line !== initialPosition.line || currentPosition.ch !== initialPosition.ch;
    }
}
