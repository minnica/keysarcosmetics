import { treatmentGroups } from "@/data/treatments";
import { pageMetadata, siteName } from "@/lib/site";
import { getTreatment } from "@/lib/treatment-pages";
import Image from "next/image";
import Link from "next/link";

type Props = { params: { categoria: string; slug: string } };

export const dynamicParams = false;

export function generateStaticParams() {
  return treatmentGroups.flatMap((group) =>
    group.treatments.map((treatment) => ({
      categoria: group.key,
      slug: treatment.slug,
    })),
  );
}

export function generateMetadata({ params }: Props) {
  const { group, treatment } = getTreatment(params.categoria, params.slug);
  return pageMetadata(
    `/tratamientos/${group.key}/${treatment.slug}`,
    `${treatment.title} en CDMX | ${siteName}`,
    treatment.description,
    treatment.imageSrc,
  );
}

export default function TreatmentPage({ params }: Props) {
  const { group, treatment } = getTreatment(params.categoria, params.slug);
  return (
    <article>
      <Link
        href={`/tratamientos/${group.key}`}
        className="text-sm font-semibold underline underline-offset-4"
      >
        Tratamientos {group.key}
      </Link>
      <h1 className="mt-5 font-title text-3xl leading-tight text-keysar-dark sm:text-5xl">
        {treatment.title}
      </h1>
      <p className="mt-4 text-keysar-gray">
        {treatment.tag} · {treatment.duration}
      </p>
      <p className="mt-5 text-lg">{treatment.description}</p>
      <div className="relative mt-8 aspect-[2/1] overflow-hidden rounded-lg bg-keysar-sand">
        <Image
          src={treatment.imageSrc}
          alt={treatment.title}
          fill
          priority
          sizes="(min-width: 896px) 832px, 100vw"
          className="object-cover"
        />
      </div>
      <h2 className="mt-8 font-title text-2xl">En qué consiste</h2>
      <p className="mt-3">{treatment.ritual}</p>
      <h2 className="mt-6 font-title text-2xl">Para quién se recomienda</h2>
      <p className="mt-3">{treatment.bestFor}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {treatment.benefits.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>
      <p className="mt-6">
        Elige una sucursal al solicitar tu cita. Una asesora confirmará si el tratamiento y el
        horario están disponibles.
      </p>
      <Link
        href={`/?tratamiento=${treatment.slug}#agenda`}
        className="mt-6 inline-block rounded-full bg-keysar-dark px-6 py-3 font-semibold text-white"
      >
        Solicitar cita para {treatment.title}
      </Link>
    </article>
  );
}
