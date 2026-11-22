import type { MetadataRoute } from "next";
import { indexable, officialOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${officialOrigin}/sitemap.xml`,
  };
}
