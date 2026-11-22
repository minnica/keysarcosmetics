import { ExperienceSections } from "@/components/experience-sections";
import { HelpPrompt } from "@/components/help-prompt";
import {
  CallToAction,
  EssenceSection,
  Hero,
  LandingFooter,
  LocationsSection,
  Navbar,
  WhatsAppButton,
} from "@/components/landing-static";
import { TestimonialsSection } from "@/components/testimonials-section";
import { StructuredData } from "@/components/structured-data";
import { whatsappPhoneNumber } from "@/lib/contact";
import { brandAlias, instagramUrl, officialOrigin, pageMetadata, siteName } from "@/lib/site";

export const metadata = pageMetadata(
  "/",
  "Keysar Cosmetics | Spa, faciales y masajes en CDMX",
  "Conoce los faciales y masajes de Keysar Cosmetics en Ciudad de México. Encuentra tu sucursal en Masaryk, Mítikah, Parque Delta o Galerías Insurgentes y solicita tu cita.",
);

export default function LandingPage() {
  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${officialOrigin}/#website`,
              name: siteName,
              alternateName: brandAlias,
              url: `${officialOrigin}/`,
              inLanguage: "es-MX",
              publisher: { "@id": `${officialOrigin}/#organizacion` },
            },
            {
              "@type": "Organization",
              "@id": `${officialOrigin}/#organizacion`,
              name: siteName,
              alternateName: brandAlias,
              url: `${officialOrigin}/`,
              logo: `${officialOrigin}/favicon.svg`,
              telephone: `+${whatsappPhoneNumber}`,
              sameAs: [instagramUrl],
            },
          ],
        }}
      />
      <main>
        <Navbar />
        <Hero />
        <EssenceSection />
        <ExperienceSections />
        <LocationsSection />
        <TestimonialsSection />
        <CallToAction />
      </main>
      <LandingFooter />
      <WhatsAppButton />
      <HelpPrompt />
    </>
  );
}
