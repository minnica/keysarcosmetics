import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { clientNavigationItems } from "@/lib/client-navigation";
import { SurveyReportWorkspace } from "@/components/clients/SurveyReportWorkspace";
import { RemindersWorkspace } from "@/components/clients/RemindersWorkspace";

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
  if (params.section === "reporte-de-encuestas")
    return <SurveyReportWorkspace />;
  if (params.section === "recordatorios") return <RemindersWorkspace />;
  const Icon = section.icon;

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <header className="border-b border-[#e8ddd4] bg-[linear-gradient(180deg,#fff_0%,#fbf8f4_100%)] px-5 py-7 sm:px-7 lg:px-10">
        <p className="label-caps">Clientes</p>
        <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3rem)]">
          {section.label}
        </h1>
      </header>
      <section className="mx-5 my-8 flex flex-col items-center rounded-3xl border border-[#e7ddd4] bg-white px-6 py-16 text-center sm:mx-7 lg:mx-10">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>
        <p className="mt-5 text-lg font-semibold">
          Pantalla pendiente de diseño
        </p>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          El acceso ya está preparado. Completaremos esta sección con su captura
          de referencia.
        </p>
        <Link
          className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[#e7ddd4] px-4 py-3 text-sm font-semibold hover:bg-[#faf8f5]"
          href="/clientes"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a base de clientes
        </Link>
      </section>
    </div>
  );
}
