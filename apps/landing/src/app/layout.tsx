import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteDescription =
  "Belleza sofisticada, minimalista y consciente. Descubre los tratamientos faciales y corporales de Keysar Cosmetics.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Keysar Cosmetics | Belleza y bienestar",
  description: siteDescription,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Keysar Cosmetics | Belleza y bienestar",
    description: siteDescription,
    locale: "es_MX",
    type: "website",
    images: ["/images/hero-keysar-desktop-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keysar Cosmetics | Belleza y bienestar",
    description: siteDescription,
    images: ["/images/hero-keysar-desktop-v2.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
