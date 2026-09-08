import { PayrollDemoPage } from "@/components/payroll/payroll-demo-page";
import type { PayrollModule } from "@/components/payroll/payroll-demo-context";

export default async function Page({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  return <PayrollDemoPage view={decodeURIComponent(moduleId) as PayrollModule} />;
}
