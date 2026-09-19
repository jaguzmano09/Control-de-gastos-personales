import type { Metadata } from "next";
import "./globals.css";
import { PWARegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "Control de gastos personales",
  description:
    "PWA de control de gastos con Next.js, Supabase y clasificación inteligente con Gemini.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
