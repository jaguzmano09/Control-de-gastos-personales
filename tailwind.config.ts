import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				ink: "#17231f",
				moss: "#496b55",
				paper: "#f7f5ef",
				clay: "#c9744c",
				"ledger-ink": "#0F1A2B",
				"ledger-paper": "#F7F5F0",
				"ledger-green": "#2F6F4E",
				"ledger-text": "#1B1F23",
				"ledger-muted": "#6B7280",
			},
		},
	},
	plugins: [],
};

export default config;