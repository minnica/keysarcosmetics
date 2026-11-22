import type { Metadata } from "next";
import localFont from "next/font/local";
import { indexable, metadataBase } from "@/lib/site";
import "./globals.css";

const bodyFont = localFont({
  src: "./fonts/afacad-latin.woff2",
  weight: "400 700",
  fallback: ["Afacad Symbols"],
  adjustFontFallback: false,
  display: "swap",
  variable: "--font-afacad",
});
const titleFont = localFont({
  src: [
    { path: "./fonts/libre-baskerville-latin.woff2", weight: "400" },
    { path: "./fonts/libre-baskerville-latin.woff2", weight: "700" },
  ],
  adjustFontFallback: false,
  display: "swap",
  variable: "--font-libre-baskerville",
});

export const metadata: Metadata = {
  metadataBase,
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" } },
  robots: { index: indexable, follow: indexable },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX" className={`${bodyFont.variable} ${titleFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
