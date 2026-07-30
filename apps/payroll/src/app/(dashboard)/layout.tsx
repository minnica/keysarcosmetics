import { PayrollShell } from "@/components/payroll/payroll-shell";
import { SessionGate } from "@/lib/session";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionGate>
      <PayrollShell>{children}</PayrollShell>
    </SessionGate>
  );
}
