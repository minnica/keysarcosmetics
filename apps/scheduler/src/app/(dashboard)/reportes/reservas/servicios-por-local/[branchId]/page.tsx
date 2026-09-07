import { SchedulerReservationReportsEntry } from "@/components/api/SchedulerPageEntries";

export default function ServicesByLocationPage({ params }: { params: { branchId: string } }) {
  return <SchedulerReservationReportsEntry view="services-by-location" fixedBranchId={decodeURIComponent(params.branchId)} />;
}
