import { PayrollOverviewPage } from "@/components/payroll/payroll-overview-page";

export default function NominaComisionesPage() {
  return (
    <PayrollOverviewPage
      payrollType="COMMISSION"
      title="Nómina comisiones"
      description="Consulta comisiones, movimientos y deducciones sin incluir sueldo base."
    />
  );
}
