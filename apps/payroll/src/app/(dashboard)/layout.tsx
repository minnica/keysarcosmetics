import { PayrollShell } from "@/components/payroll/payroll-shell";
import { AutomaticTableSorting } from "@/components/payroll/automatic-table-sorting";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PayrollShell>
      <AutomaticTableSorting />
      {children}
    </PayrollShell>
  );
}
