import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				"ledger-paper": "rgb(var(--paper) / <alpha-value>)",
				"ledger-green": "rgb(var(--moss) / <alpha-value>)",
				"ledger-green-dark": "rgb(var(--pine) / <alpha-value>)",
				"ledger-line": "rgb(var(--line) / <alpha-value>)",
				"ledger-text": "rgb(var(--ink) / <alpha-value>)",
				"ledger-muted": "rgb(var(--muted) / <alpha-value>)",
			},
		},
	},
	plugins: [],
};

export default config;
