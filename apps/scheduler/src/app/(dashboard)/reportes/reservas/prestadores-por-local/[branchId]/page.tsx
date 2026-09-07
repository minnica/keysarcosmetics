import { SchedulerReservationReportsEntry } from "@/components/api/SchedulerPageEntries";

export default function ProvidersByLocationPage({ params }: { params: { branchId: string } }) {
  return <SchedulerReservationReportsEntry view="providers-by-location" fixedBranchId={decodeURIComponent(params.branchId)} />;
}
