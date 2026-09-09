import { notFound } from "next/navigation";
import { clientNavigationItems } from "@/lib/client-navigation";
import { SchedulerClientSectionEntry } from "@/components/api/SchedulerPageEntries";

export function generateStaticParams() {
  return clientNavigationItems
    .slice(1)
    .map((item) => ({ section: item.href.split("/").pop()! }));
}

export default function ClientSectionPage({
  params,
}: {
  params: { section: string };
}) {
  const section = clientNavigationItems.find(
    (item) => item.href === `/clientes/${params.section}`,
  );
  if (!section) notFound();
  return (
    <SchedulerClientSectionEntry
      section={
        params.section === "reporte-de-encuestas"
          ? "reporte-de-encuestas"
          : "recordatorios"
      }
    />
  );
}
