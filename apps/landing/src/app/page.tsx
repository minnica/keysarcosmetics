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

export default function LandingPage() {
  return (
    <>
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
