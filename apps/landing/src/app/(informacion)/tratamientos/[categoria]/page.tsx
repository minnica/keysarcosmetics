import { treatmentGroups } from "@/data/treatments";
import { pageMetadata, siteName } from "@/lib/site";
import { getCategory } from "@/lib/treatment-pages";
import Link from "next/link";

type Props = { params: { categoria: string } };

export const dynamicParams = false;

export function generateStaticParams() {
  return treatmentGroups.map((group) => ({ categoria: group.key }));
}

export function generateMetadata({ params }: Props) {
  const group = getCategory(params.categoria);
  return pageMetadata(
    `/tratamientos/${group.key}`,
    `Tratamientos ${group.key} en CDMX | ${siteName}`,
    group.introduction,
  );
}

export default function CategoryPage({ params }: Props) {
  const group = getCategory(params.categoria);
  return (
    <>
      <h1 className="font-title text-3xl leading-tight text-keysar-dark sm:text-5xl">
        Tratamientos {group.key} en CDMX
      </h1>
      <p className="mt-5 max-w-2xl text-lg">{group.introduction}</p>
      <ul className="mt-9 divide-y divide-keysar-gold/25">
        {group.treatments.map((treatment) => (
          <li key={treatment.slug} className="py-5">
            <h2 className="font-title text-xl text-keysar-dark">
              <Link
                href={`/tratamientos/${group.key}/${treatment.slug}`}
                prefetch={false}
                className="underline decoration-keysar-gold/50 underline-offset-4"
              >
                {treatment.title}
              </Link>
            </h2>
            <p className="mt-2">{treatment.description}</p>
            <p className="mt-1 text-sm text-keysar-gray">{treatment.duration}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
