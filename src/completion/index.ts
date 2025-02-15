import { Editor } from "obsidian";
import { Suggestion } from "src/extension";
import { Provider, Providers } from "src/providers";
import { CompletionOptions, DEFAULT_PROFILE, Profile, Settings } from "src/settings";

export async function* generateCompletion(editor: Editor, provider: Provider, options: CompletionOptions): AsyncGenerator<Suggestion> {
    await provider.abort();
    const cursor = editor.getCursor();

    // If the current line is empty, don't suggest anything.
    const currentLine = editor.getLine(cursor.line);
    if (!currentLine.length) {
        return;
    }

    // Only if the last character is a space or dot, suggest completions.
    const lastChar = currentLine[cursor.ch - 1];
    if (lastChar !== " ") {
        return;
    }

    for await (const text of provider.generate(editor, options)) {
        yield { text: text };
    }
}

export function resolveProfile(settings: Settings, providers: Providers, filePath: string): [Provider, Profile] {
    const profileName = resolveProfileFromPath(settings, filePath);
    const profile = settings.profiles[profileName];
    const provider = providers[profile.provider];
    return [provider, profile];
}

/**
 * Resolves the profile name based on the file path
 * @param settings Plugin settings containing path mappings and profiles
 * @param filePath The path of the file relative to the vault root
 * @returns The name of the profile to use
 */
export function resolveProfileFromPath(settings: Settings, filePath: string): string {
    // If no path mappings exist, return default profile
    if (!settings.path_profile_mappings || Object.keys(settings.path_profile_mappings).length === 0) {
        return DEFAULT_PROFILE;
    }

    // Normalize the file path (remove leading/trailing slashes)
    const normalizedPath = filePath.replace(/^\/+|\/+$/g, '');

    // Find the longest matching path prefix
    let longestMatch = '';
    let matchedProfile = DEFAULT_PROFILE;

    Object.entries(settings.path_profile_mappings).forEach(([path, profile]) => {
        const normalizedMappingPath = path.replace(/^\/+|\/+$/g, '');

        // Check if the file path starts with the mapping path
        if (normalizedPath.startsWith(normalizedMappingPath)) {
            // If this is a longer match than our current longest, update it
            if (normalizedMappingPath.length > longestMatch.length) {
                longestMatch = normalizedMappingPath;
                matchedProfile = profile;
            }
        }
    });

    return matchedProfile;
}