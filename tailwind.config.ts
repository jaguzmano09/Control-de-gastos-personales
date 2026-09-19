import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#17231f", moss: "#496b55", paper: "#f7f5ef", clay: "#c9744c" } } }, plugins: [] };
export default config;