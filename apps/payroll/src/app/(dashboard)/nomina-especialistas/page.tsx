import { PayrollOverviewPage } from "@/components/payroll/payroll-overview-page";

export default function NominaEspecialistasPage() {
  return (
    <PayrollOverviewPage
      payrollType="SPECIALIST"
      title="Nómina especialistas"
      description="Consulta el sueldo de facialistas y especialistas activos."
    />
  );
}
