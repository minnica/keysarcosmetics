import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keysar HR",
  description: "Gestión de personas, turnos y bienestar de Keysar Cosmetics.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
