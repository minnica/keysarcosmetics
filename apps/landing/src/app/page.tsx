import { AppointmentSection } from "@/components/appointment-section";
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
import { TreatmentsSection } from "@/components/treatments-section";
import { VideoReelsSection } from "@/components/video-reels-section";

export default function LandingPage() {
  return (
    <>
      <main>
        <Navbar />
        <Hero />
        <EssenceSection />
        <TreatmentsSection />
        <VideoReelsSection />
        <AppointmentSection />
        <LocationsSection />
        <TestimonialsSection />
        <CallToAction />
      </main>
      <LandingFooter />
      <WhatsAppButton />
    </>
  );
}
