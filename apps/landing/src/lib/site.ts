import type { Metadata } from "next";

export const siteName = "Keysar Cosmetics";
export const brandAlias = "keysarcosmetics";
export const officialOrigin = "https://keysarcosmetics.com";
export const instagramUrl = "https://www.instagram.com/keysarcosmetics/";

export const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production" ? officialOrigin : "http://localhost:3000"),
);

export const indexable =
  metadataBase.origin === officialOrigin &&
  process.env.NODE_ENV === "production" &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");

export function pageMetadata(
  path: string,
  title: string,
  description: string,
  image = "/images/hero-keysar-brand.png",
): Metadata {
  const url = new URL(path, officialOrigin).href;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "es_MX",
      siteName,
      url,
      title,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
