import { locations } from "@/data/locations";
import { treatmentGroups } from "@/data/treatments";
import { indexable, officialOrigin } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexable) return [];
  const paths = [
    "/",
    ...locations.map(({ slug }) => `/sucursales/${slug}`),
    ...treatmentGroups.flatMap((group) => {
      const category = `/tratamientos/${group.key}`;
      return [category, ...group.treatments.map(({ slug }) => `${category}/${slug}`)];
    }),
  ];
  return paths.map((path) => ({ url: new URL(path, officialOrigin).href }));
}
