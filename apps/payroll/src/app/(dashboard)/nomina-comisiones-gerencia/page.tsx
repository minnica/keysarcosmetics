import { PayrollOverviewPage } from "@/components/payroll/payroll-overview-page";

export default function NominaComisionesGerenciaPage() {
  return (
    <PayrollOverviewPage
      payrollType="MANAGEMENT_COMMISSION"
      title="Comisiones gerencia"
      description="Consulta comisiones, movimientos y deducciones de puestos de gerencia sin incluir sueldo base."
    />
  );
}
