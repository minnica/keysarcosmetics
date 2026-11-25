"use client";
import { useState } from "react";
import { usePilotCut } from "@/components/payroll/pilot-gate";
import { usePayrollDemo } from "@/components/payroll/payroll-demo-context";
import { employeeMixedCostAllocationShares } from "@/components/payroll/payroll-cost-branch-selector";

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
export default function ReconciliationPage() {
  const cut = usePilotCut(),
    { state, payrollLines } = usePayrollDemo();
  const [period, setPeriod] = useState(cut.original.closedStart);
  const p = cut.original.periods.find((v) => v.start === period)!;
  const reference = cut.references.find((r) => r.period === period)!;
  const lines = payrollLines(
    p.start,
    reference.mode,
    p.finish,
    "CONSOLIDATED",
  ).filter((l) => l.employee.id !== "pilot-operator");
  const refMap = new Map(reference.lines.map((r) => [r.employeeId, r]));
  const trial = new Map(lines.map((r) => [r.employee.id, r]));
  const ids = [...new Set([...refMap.keys(), ...trial.keys()])];
  const officialTotal =
    reference.lines.reduce(
      (total, line) => total + Math.round(line.totalPayment * 100),
      0,
    ) / 100;
  const trialTotal =
    lines.reduce((total, line) => total + Math.round(line.total * 100), 0) /
    100;
  const branch = new Map<string, { official: number; trial: number }>();
  function add(name: string, side: "official" | "trial", n: number) {
    const row = branch.get(name) ?? { official: 0, trial: 0 };
    row[side] += n;
    branch.set(name, row);
  }
  for (const line of reference.lines)
    for (const b of line.branches) add(b.branchName, "official", b.cost);
  for (const l of lines) {
    const shares = employeeMixedCostAllocationShares({
      employee: l.employee,
      branches: state.branches,
      sales: state.sales,
      periodStart: p.start,
      periodEnd: p.finish,
      fixedAmount: l.fixedSalary + l.doublePayAmount,
      variableAmount: Math.max(0, l.total - l.fixedSalary - l.doublePayAmount),
    });
    if (!shares.length) add("SIN ASIGNACIÓN", "trial", l.totalCost);
    for (const share of shares)
      add(
        state.branches.find((b) => b.id === share.branchId)?.name ??
          "SIN ASIGNACIÓN",
        "trial",
        l.totalCost * share.share,
      );
  }
  return (
    <main className="grid gap-5 p-5">
      <h1 className="page-title">Conciliación del piloto</h1>
      <label>
        Quincena{" "}
        <select
          className="rounded border p-2"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {cut.original.periods.map((v) => (
            <option value={v.start} key={v.start}>
              {v.start} — {v.finish}
            </option>
          ))}
        </select>
      </label>
      <p>
        Referencia{" "}
        {reference.source === "CALCULATED"
          ? "calculada con el motor vigente a la fecha del corte"
          : {
              PAID: "de corrida pagada",
              APPROVED: "de corrida aprobada",
              DRAFT: "de corrida en borrador",
            }[reference.source]}
        . Modo {reference.mode === "WITH_VAT" ? "con IVA" : "sin IVA"}. Las
        columnas de diferencia muestran piloto menos referencia.
      </p>
      <dl className="flex flex-wrap gap-6 rounded border p-3">
        {[
          ["Neto de referencia", officialTotal],
          ["Neto del piloto", trialTotal],
          ["Diferencia total", trialTotal - officialTotal],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {money(Number(value))}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        Las fechas laborales de alta y baja, las tasas fiscales y las
        asignaciones por módulo requieren validación de Nómina. Al importar se
        considera la quincena completa para el sueldo. El código de confirmación
        para simular autorizaciones es 0000.
      </p>
      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <caption className="text-left font-semibold">
            Comparación por persona
          </caption>
          <thead>
            <tr>
              {[
                "Empleado",
                "Δ Sueldo",
                "Δ Comisión",
                "Δ Bonos",
                "Δ Multas",
                "Δ Préstamos",
                "Δ Viáticos",
                "Δ Otros movimientos",
                "Neto referencia",
                "Neto piloto",
                "Diferencia",
                "Recibo oficial",
              ].map((t) => (
                <th className="p-2" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const r = refMap.get(id),
                v = trial.get(id);
              const vals = [
                (v?.fixedSalary ?? 0) - (r?.salaryPayment ?? 0),
                (v?.commission ?? 0) - (r?.commission ?? 0),
                (v?.bonuses ?? 0) - (r?.bonus ?? 0),
                (v?.fines ?? 0) - (r?.fine ?? 0),
                (v?.loanDeduction ?? 0) - (r?.loanPayment ?? 0),
                (v?.viaticsAdditions ?? 0) -
                  (v?.viaticsDeductions ?? 0) -
                  (r?.perDiem ?? 0),
                (v?.externalAdditions ?? 0) -
                  (v?.externalDeductions ?? 0) -
                  (r?.adjustmentPositive ?? 0) -
                  (r?.supplies ?? 0) +
                  (r?.adjustmentNegative ?? 0),
                r?.totalPayment,
                v?.total,
                (v?.total ?? 0) - (r?.totalPayment ?? 0),
              ];
              return (
                <tr key={id} className="border-t">
                  <td className="p-2">
                    {state.employees.find((e) => e.id === id)?.name ??
                      cut.original.employees.find((e) => e.id === id)?.name ??
                      id}
                  </td>
                  {vals.map((n, i) => (
                    <td key={i} className="whitespace-nowrap p-2 tabular-nums">
                      {n === undefined ? "Sin línea" : money(n)}
                    </td>
                  ))}
                  <td>{r?.receiptStatus ?? "Sin emisión"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <caption className="text-left font-semibold">
            Costo por sucursal
          </caption>
          <thead>
            <tr>
              {["Sucursal", "Referencia", "Piloto", "Diferencia"].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(branch).map(([name, n]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{money(n.official)}</td>
                <td>{money(n.trial)}</td>
                <td>{money(n.trial - n.official)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
