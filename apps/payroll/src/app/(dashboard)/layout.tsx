import { PayrollShell } from "@/components/payroll/payroll-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PayrollShell>{children}</PayrollShell>;
}
