import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import { DEFAULT_BRANDS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js";

// "cursor" here means the text cursor, not the Cursor editor
const brands = [...DEFAULT_BRANDS.filter((brand) => brand !== "Cursor"), "Ollama", "Grok", "xAI"];

export default defineConfig([
	{
		ignores: ["node_modules/", "main.js", "tests/", "esbuild.config.mjs", "version-bump.mjs"],
	},
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.mjs"],
				},
			},
		},
		rules: {
			"obsidianmd/ui/sentence-case": ["warn", { brands }],
		},
	},
]);
