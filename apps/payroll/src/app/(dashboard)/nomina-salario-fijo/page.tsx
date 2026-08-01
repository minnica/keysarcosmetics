import { PayrollOverviewPage } from "@/components/payroll/payroll-overview-page";

export default function NominaSalarioFijoPage() {
  return (
    <PayrollOverviewPage
      payrollType="FIXED_SALARY"
      title="Nómina salario fijo"
      description="Consulta el sueldo de empleados activos que no pertenecen a puestos especialistas."
    />
  );
}
