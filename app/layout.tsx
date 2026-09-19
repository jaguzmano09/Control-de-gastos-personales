import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Control de gastos", description: "Control personal de gastos y presupuestos", manifest: "/manifest.webmanifest" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
