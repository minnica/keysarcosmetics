import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Keysar Cosmetics | Belleza y bienestar",
  description:
    "Masajes y tratamientos faciales premium diseñados para realzar tu belleza desde el equilibrio, la calma y el detalle.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Keysar Cosmetics | Belleza y bienestar",
    description:
      "Masajes y tratamientos faciales premium diseñados para realzar tu belleza desde el equilibrio, la calma y el detalle.",
    locale: "es_MX",
    type: "website",
    images: ["/images/hero-keysar-brand.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keysar Cosmetics | Belleza y bienestar",
    description:
      "Masajes y tratamientos faciales premium diseñados para realzar tu belleza desde el equilibrio, la calma y el detalle.",
    images: ["/images/hero-keysar-brand.png"],
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
