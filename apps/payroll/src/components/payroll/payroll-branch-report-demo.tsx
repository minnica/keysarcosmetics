"use client";

import { useMemo, useState } from "react";
import { BarChart3, Building2, CircleDollarSign, TrendingUp, WalletCards } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import { ReportExportButtons } from "./report-export-buttons";
import { usePayrollDemo } from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

interface BranchSummaryRow {
  id: string;
  branch: string;
  sales: number;
  fixedSalary: number;
  variablePay: number;
  deductions: number;
  payrollCost: number;
  employees: number;
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return <Card><CardContent className="p-5"><Icon className="h-5 w-5 text-[color:var(--text-secondary)]" /><p className="label-caps mt-4">{label}</p><p className="number-display mt-2 text-2xl">{value}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{detail}</p></CardContent></Card>;
}

export function PayrollBranchReportDemo() {
  const { state, currentPeriod, periodOptions, payrollLines } = usePayrollDemo();
  const [periodStart, setPeriodStart] = useState(currentPeriod.start);
  const period = periodOptions.find((item) => item.start === periodStart) ?? currentPeriod;
  const run = state.runs.find((item) => item.periodStart === periodStart);
  const lines = payrollLines(periodStart, run?.mode ?? "WITH_VAT");

  const rows = useMemo<BranchSummaryRow[]>(() => state.branches.map((branch) => {
    const branchSales = state.sales.filter((sale) => sale.branchId === branch.id && sale.date >= period.start && sale.date <= period.end).reduce((sum, sale) => sum + sale.amount, 0);
    let fixedSalary = 0;
    let variablePay = 0;
    let deductions = 0;
    const employeeIds = new Set<string>();
    lines.forEach((line) => {
      const employeeSales = state.sales.filter((sale) => sale.employeeId === line.employee.id && sale.date >= period.start && sale.date <= period.end);
      const employeeSalesTotal = employeeSales.reduce((sum, sale) => sum + sale.amount, 0);
      const employeeBranchSales = employeeSales.filter((sale) => sale.branchId === branch.id).reduce((sum, sale) => sum + sale.amount, 0);
      const share = employeeSalesTotal > 0 ? employeeBranchSales / employeeSalesTotal : line.employee.branchId === branch.id ? 1 : 0;
      if (share > 0) employeeIds.add(line.employee.id);
      fixedSalary += line.fixedSalary * share;
      variablePay += (line.commission + line.bonuses) * share;
      deductions += (line.fines + line.loanDeduction) * share;
    });
    return { id: branch.id, branch: branch.name, sales: branchSales, fixedSalary, variablePay, deductions, payrollCost: fixedSalary + variablePay - deductions, employees: employeeIds.size };
  }), [lines, period.end, period.start, state.branches, state.sales]);

  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.payrollCost, 0);
  const maxCost = Math.max(...rows.map((row) => row.payrollCost), 1);
  const exportConfig = {
    title: "Desglose de nómina por sucursal",
    subtitle: `${period.label} · Datos mock`,
    filename: `nomina-por-sucursal-${period.start}`,
    sheetName: "Por sucursal",
    rows,
    columns: [
      { header: "SUCURSAL", accessor: (row: BranchSummaryRow) => row.branch, width: 24 },
      { header: "EMPLEADOS", accessor: (row: BranchSummaryRow) => row.employees, format: "number" as const, width: 12 },
      { header: "VENTAS", accessor: (row: BranchSummaryRow) => row.sales, format: "currency" as const, width: 16 },
      { header: "SUELDO FIJO", accessor: (row: BranchSummaryRow) => row.fixedSalary, format: "currency" as const, width: 16 },
      { header: "VARIABLE", accessor: (row: BranchSummaryRow) => row.variablePay, format: "currency" as const, width: 16 },
      { header: "DEDUCCIONES", accessor: (row: BranchSummaryRow) => row.deductions, format: "currency" as const, width: 16 },
      { header: "COSTO NÓMINA", accessor: (row: BranchSummaryRow) => row.payrollCost, format: "currency" as const, width: 18 },
    ],
  };

  return <div className="space-y-7"><header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">REPORTE MOCK</Badge><span className="text-xs text-[color:var(--text-muted)]">Distribución por punto de venta</span></div><h1 className="page-title">Dashboard por sucursal</h1><p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">Reparte sueldo, comisión, bonos y deducciones según la venta de cada empleado en cada punto.</p></div><ReportExportButtons config={exportConfig} /></header><Card><CardContent className="p-5"><div className="max-w-xl space-y-2"><Label>Periodo quincenal</Label><Select value={periodStart} onValueChange={setPeriodStart}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{periodOptions.map((item) => <SelectItem key={item.start} value={item.start}>{item.label}</SelectItem>)}</SelectContent></Select></div></CardContent></Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={TrendingUp} label="VENTAS CONSOLIDADAS" value={money.format(totalSales)} detail="Total de las sucursales" /><Metric icon={WalletCards} label="COSTO DE NÓMINA" value={money.format(totalCost)} detail="Fijo + variable − deducciones" /><Metric icon={CircleDollarSign} label="NÓMINA / VENTA" value={`${totalSales > 0 ? (totalCost / totalSales * 100).toFixed(1) : "0.0"}%`} detail="Participación del costo" /><Metric icon={Building2} label="PUNTOS DE VENTA" value={String(rows.length)} detail="Sucursales incluidas" /></div><div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]"><Card className="border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Costo comparado</CardTitle><CardDescription>Métrica visual por sucursal.</CardDescription></CardHeader><CardContent className="space-y-5">{rows.map((row) => <div key={row.id}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">{row.branch}</span><span className="number-display">{money.format(row.payrollCost)}</span></div><div className="h-3 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] to-[#648672]" style={{ width: `${Math.max(row.payrollCost / maxCost * 100, 4)}%` }} /></div><p className="mt-1 text-xs text-[color:var(--text-muted)]">{row.employees} empleados · {totalCost > 0 ? (row.payrollCost / totalCost * 100).toFixed(1) : 0}% del costo</p></div>)}</CardContent></Card><Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader><CardTitle className="section-heading uppercase">Reporte de distribución</CardTitle><CardDescription>Datos listos para asignar el costo a cada punto de venta.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>SUCURSAL</TableHead><TableHead className="text-right">VENTAS</TableHead><TableHead className="text-right">FIJO</TableHead><TableHead className="text-right">VARIABLE</TableHead><TableHead className="text-right">DEDUCCIONES</TableHead><TableHead className="text-right">COSTO</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-semibold">{row.branch}</p><p className="text-xs text-[color:var(--text-muted)]">{row.employees} empleados</p></TableCell><TableCell className="number-display text-right">{money.format(row.sales)}</TableCell><TableCell className="number-display text-right">{money.format(row.fixedSalary)}</TableCell><TableCell className="number-display text-right">{money.format(row.variablePay)}</TableCell><TableCell className="number-display text-right text-rose-700 dark:text-rose-300">{money.format(row.deductions)}</TableCell><TableCell className="number-display text-right">{money.format(row.payrollCost)}</TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell>TOTAL</TableCell><TableCell className="number-display text-right">{money.format(totalSales)}</TableCell><TableCell colSpan={3} /><TableCell className="number-display text-right">{money.format(totalCost)}</TableCell></TableRow></TableFooter></Table></div></CardContent></Card></div></div>;
}

