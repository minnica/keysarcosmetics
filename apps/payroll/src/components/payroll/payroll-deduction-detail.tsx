import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@cosmetics/ui";
import { usePilotCut } from "./pilot-gate";
import type { EmployeePayrollLine } from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function PayrollDeductionDetail({
  line,
  start,
  end,
}: {
  line: EmployeePayrollLine;
  start: string;
  end: string;
}) {
  const cut = usePilotCut();
  const refs = cut.references.filter(
    (r) => r.period >= start && r.period <= end,
  );
  const pending = line.newNegativeBalanceBreakdown;
  const imported = new Set([
    ...cut.original.movements.map((m) => m.id),
    ...cut.original.loans.map((l) => l.id),
  ]);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          aria-label={`Ver deducciones de ${line.employee.name}`}
        >
          Ver movimientos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deducciones y saldo pendiente</DialogTitle>
          <DialogDescription>
            {line.employee.name} · {start} — {end}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {line.deductionDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="text-left font-semibold">
                  Movimientos aplicados en el piloto
                </caption>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Fecha o quincena</th>
                    <th>Referencia</th>
                    <th className="text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {line.deductionDetails.map((item, index) => (
                    <tr className="border-t" key={index}>
                      <td className="py-2">{item.source}</td>
                      <td>{item.date}</td>
                      <td className="break-all">
                        {item.reference ? (
                          <>
                            {imported.has(item.reference) ? "Corte" : "Prueba"}{" "}
                            · {item.reference}
                          </>
                        ) : (
                          "Cálculo del piloto"
                        )}
                      </td>
                      <td className="text-right">
                        {money.format(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Sin movimientos de deducción en este periodo.</p>
          )}
          <p className="font-semibold">
            Deducciones del piloto · {money.format(line.totalDeductions)}
          </p>
          <p>
            Pendiente para otro pago · {money.format(line.newNegativeBalance)}.
            Es la parte de los descuentos que el ingreso disponible de esta
            nómina no alcanzó a cubrir.
          </p>
          {line.newNegativeBalance > 0 && (
            <p className="text-xs">
              Multas {money.format(pending.fines)} · Préstamos{" "}
              {money.format(pending.loans)} · Adelantos{" "}
              {money.format(pending.advances)} · Otros descuentos{" "}
              {money.format(pending.otherDeductions)}
            </p>
          )}
          {refs.map((ref) => {
            const source = ref.lines.find(
              (r) => r.employeeId === line.employee.id,
            );
            return (
              <div className="border-t pt-2 text-sm" key={ref.period}>
                <strong>
                  Referencia del corte · {ref.period} ·{" "}
                  {
                    {
                      APPROVED: "aprobada",
                      PAID: "pagada",
                      DRAFT: "borrador",
                      CALCULATED: "calculada",
                    }[ref.source]
                  }
                </strong>
                <p>
                  {source
                    ? `El total de esta persona en la referencia incluye multas por ${money.format(source.fine)}, cuotas de préstamos y adelantos ${money.format(source.loanPayment)}, ajustes negativos ${money.format(source.adjustmentNegative)}.`
                    : "Sin línea de referencia para esta persona."}
                </p>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
