"use client";

import { BarChart3, Building2, CircleDollarSign, ShieldPlus, TrendingUp } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import { type EmployeePayrollLine, usePayrollDemo } from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

interface BranchAnalytics {
  id: string;
  name: string;
  employees: number;
  sales: number;
  payroll: number;
  socialCost: number;
  isr: number;
  totalCost: number;
}

function Kpi({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return <Card className="border-[color:var(--border-color)]"><CardContent className="p-5"><Icon className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">{label}</p><p className="number-display mt-2 text-2xl">{value}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{detail}</p></CardContent></Card>;
}

export function PayrollModuleAnalytics({
  lines,
  periodStart,
  periodEnd,
  title,
}: {
  lines: EmployeePayrollLine[];
  periodStart: string;
  periodEnd: string;
  title: string;
}) {
  const { state } = usePayrollDemo();
  const rows: BranchAnalytics[] = state.branches.map((branch) => {
    let sales = 0;
    let payroll = 0;
    let socialCost = 0;
    let isr = 0;
    const employees = new Set<string>();
    lines.forEach((line) => {
      const employeeSales = state.sales.filter((sale) => sale.employeeId === line.employee.id && sale.date >= periodStart && sale.date <= periodEnd);
      const totalEmployeeSales = employeeSales.reduce((sum, sale) => sum + sale.amount, 0);
      const employeeBranchSales = employeeSales.filter((sale) => sale.branchId === branch.id).reduce((sum, sale) => sum + sale.amount, 0);
      const share = totalEmployeeSales > 0 ? employeeBranchSales / totalEmployeeSales : line.employee.branchId === branch.id ? 1 : 0;
      if (share > 0) employees.add(line.employee.id);
      sales += line.sales * share;
      payroll += line.total * share;
      socialCost += line.socialCost * share;
      isr += line.isrCost * share;
    });
    return { id: branch.id, name: branch.name, employees: employees.size, sales, payroll, socialCost, isr, totalCost: payroll + socialCost + isr };
  });
  const payroll = lines.reduce((sum, line) => sum + line.total, 0);
  const socialCost = lines.reduce((sum, line) => sum + line.socialCost, 0);
  const isr = lines.reduce((sum, line) => sum + line.isrCost, 0);
  const totalCost = lines.reduce((sum, line) => sum + line.totalCost, 0);
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const maxCost = Math.max(...rows.map((row) => row.totalCost), 1);

  return <section className="space-y-5 pt-2" aria-labelledby="module-analytics-title"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="label-caps">REPORTES AUTOMÁTICOS</p><h2 id="module-analytics-title" className="mt-1 text-xl font-semibold">Analítica de {title.toLocaleLowerCase("es-MX")}</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">Se actualiza automáticamente con el periodo activo, movimientos y costos configurados.</p></div><Badge variant="outline">{periodStart} — {periodEnd}</Badge></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={CircleDollarSign} label="NÓMINA" value={money.format(payroll)} detail="Pago neto del módulo" /><Kpi icon={ShieldPlus} label="COSTO SOCIAL" value={money.format(socialCost)} detail="Carga patronal configurada" /><Kpi icon={TrendingUp} label="ISR" value={money.format(isr)} detail="Provisión configurada" /><Kpi icon={Building2} label="COSTO TOTAL" value={money.format(totalCost)} detail="Nómina + costo social + ISR" /></div><div className="grid gap-6 xl:grid-cols-[0.85fr_1.4fr]"><Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Dispersión de costo</CardTitle><CardDescription>Participación automática por sucursal.</CardDescription></CardHeader><CardContent className="space-y-5">{rows.map((row) => <div key={row.id}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{row.name}</span><span className="number-display">{money.format(row.totalCost)}</span></div><div className="h-3 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] via-[#a88662] to-[#648672]" style={{ width: `${Math.max(row.totalCost / maxCost * 100, row.totalCost > 0 ? 4 : 0)}%` }} /></div><p className="mt-1 text-xs text-[color:var(--text-muted)]">{row.employees} empleados · {totalCost > 0 ? (row.totalCost / totalCost * 100).toFixed(1) : "0.0"}% del costo</p></div>)}</CardContent></Card><Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[color:var(--text-secondary)]" /><CardTitle className="section-heading uppercase">Detalle por sucursal</CardTitle></div><CardDescription>Ventas, dispersión y costo integral del módulo.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>SUCURSAL</TableHead><TableHead className="text-right">VENTAS</TableHead><TableHead className="text-right">NÓMINA</TableHead><TableHead className="text-right">SOCIAL</TableHead><TableHead className="text-right">ISR</TableHead><TableHead className="text-right">TOTAL</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-semibold">{row.name}</p><p className="text-xs text-[color:var(--text-muted)]">{row.employees} empleados</p></TableCell><TableCell className="number-display text-right">{money.format(row.sales)}</TableCell><TableCell className="number-display text-right">{money.format(row.payroll)}</TableCell><TableCell className="number-display text-right">{money.format(row.socialCost)}</TableCell><TableCell className="number-display text-right">{money.format(row.isr)}</TableCell><TableCell className="number-display text-right">{money.format(row.totalCost)}</TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell>TOTAL</TableCell><TableCell className="number-display text-right">{money.format(totalSales)}</TableCell><TableCell colSpan={3} /><TableCell className="number-display text-right">{money.format(totalCost)}</TableCell></TableRow></TableFooter></Table></div></CardContent></Card></div></section>;
}
