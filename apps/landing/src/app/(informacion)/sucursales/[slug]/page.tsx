import { StructuredData } from "@/components/structured-data";
import { locations, openingHours } from "@/data/locations";
import { whatsappPhoneNumber } from "@/lib/contact";
import { officialOrigin, pageMetadata, siteName } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: { slug: string } };

export const dynamicParams = false;

export function generateStaticParams() {
  return locations.map(({ slug }) => ({ slug }));
}

function getLocation(slug: string) {
  const location = locations.find((item) => item.slug === slug);
  if (!location) notFound();
  return location;
}

export function generateMetadata({ params }: Props) {
  const location = getLocation(params.slug);
  return pageMetadata(
    `/sucursales/${location.slug}`,
    `${location.name} en CDMX | ${siteName}`,
    location.directions,
  );
}

export default function LocationPage({ params }: Props) {
  const location = getLocation(params.slug);
  const url = `${officialOrigin}/sucursales/${location.slug}`;
  return (
    <article>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "HealthAndBeautyBusiness",
          "@id": `${url}#sucursal`,
          name: location.businessName,
          url,
          parentOrganization: { "@id": `${officialOrigin}/#organizacion`, name: siteName },
          telephone: `+${whatsappPhoneNumber}`,
          address: {
            "@type": "PostalAddress",
            streetAddress: location.street,
            addressLocality: location.district,
            addressRegion: "Ciudad de México",
            postalCode: location.postalCode,
            addressCountry: "MX",
          },
          hasMap: location.mapUrl,
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            ...openingHours,
          },
        }}
      />
      <h1 className="font-title text-3xl leading-tight text-keysar-dark sm:text-5xl">
        {location.businessName}
      </h1>
      <h2 className="mt-8 font-title text-2xl">Cómo llegar</h2>
      <address className="mt-3 text-lg not-italic">
        {location.street}, {location.district}, {location.postalCode}, Ciudad de México.
      </address>
      <p className="mt-4">{location.directions}</p>
      <a
        href={location.mapUrl}
        className="mt-4 inline-block font-semibold underline underline-offset-4"
      >
        Ver en Google Maps
      </a>
      {location.directionsUrl && (
        <a
          href={location.directionsUrl}
          className="ml-5 inline-block font-semibold underline underline-offset-4"
        >
          Ruta al centro comercial
        </a>
      )}
      <h2 className="mt-8 font-title text-2xl">Citas y horarios</h2>
      <p className="mt-3">
        La sucursal abre de lunes a domingo, de {openingHours.opens} a {openingHours.closes}.
        Para confirmar la disponibilidad de un tratamiento o solicitar una cita, llama al{" "}
        <a href={`tel:+${whatsappPhoneNumber}`} className="underline">
          55 8056 1135
        </a>
        .
      </p>
      <Link
        href={`/?sucursal=${location.bookingValue}#agenda`}
        className="mt-6 inline-block rounded-full bg-keysar-dark px-6 py-3 font-semibold text-white"
      >
        Solicitar cita en esta sucursal
      </Link>
    </article>
  );
}
