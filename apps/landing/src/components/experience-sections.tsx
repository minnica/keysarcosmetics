"use client";

import { AppointmentSection } from "@/components/appointment-section";
import { TreatmentsSection } from "@/components/treatments-section";
import { VideoReelsSection } from "@/components/video-reels-section";
import { useState } from "react";

export function ExperienceSections() {
  const [service, setService] = useState("");

  return (
    <>
      <TreatmentsSection onSelectService={setService} />
      <VideoReelsSection />
      <AppointmentSection service={service} onServiceChange={setService} />
    </>
  );
}
