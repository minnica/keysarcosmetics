"use client";

import {
  BarChart3,
  Building2,
  PieChart as PieChartIcon,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cosmetics/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ConsolidatedSalesTrendPoint {
  month: string;
  label: string;
  sales: number;
  totalCost: number;
}

export interface ConsolidatedBranchSalesPoint {
  id: string;
  name: string;
  sales: number;
  cost: number;
  employees: number;
}

interface ConsolidatedSalesAnalyticsProps {
  periodLabel: string;
  trend: ConsolidatedSalesTrendPoint[];
  branches: ConsolidatedBranchSalesPoint[];
  payrollBase: number;
  socialCost: number;
  isrCost: number;
  totalSales: number;
}

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const compactMoney = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentage = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 1,
});

const chartColors = {
  sales: "#b57a4b",
  payroll: "#6f907d",
  social: "#c07f7f",
  isr: "#8d7baa",
  grid: "#d8c9bb",
  text: "#7b6f65",
};

function currencyTooltip(value: number | string) {
  return money.format(Number(value));
}

export function PayrollConsolidatedSalesAnalytics({
  periodLabel,
  trend,
  branches,
  payrollBase,
  socialCost,
  isrCost,
  totalSales,
}: ConsolidatedSalesAnalyticsProps) {
  const totalCost = payrollBase + socialCost + isrCost;
  const costRatio = totalSales > 0 ? totalCost / totalSales : null;
  const rankedBranches = [...branches].sort((a, b) => b.sales - a.sales);
  const salesLeader = rankedBranches[0] ?? null;
  const efficientBranch =
    branches
      .filter((branch) => branch.sales > 0)
      .sort((a, b) => a.cost / a.sales - b.cost / b.sales)[0] ?? null;
  const composition = [
    { name: "Nómina base", value: payrollBase, color: chartColors.payroll },
    { name: "Costo social", value: socialCost, color: chartColors.social },
    { name: "ISR", value: isrCost, color: chartColors.isr },
  ].filter((item) => item.value > 0);

  return (
    <section className="space-y-4" aria-labelledby="sales-analytics-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[color:var(--accent)]" />
            <h2
              id="sales-analytics-title"
              className="section-heading uppercase"
            >
              Analítica del consolidado de ventas
            </h2>
          </div>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Tendencia, composición del costo y eficiencia por sucursal con los
            datos que alimentan este consolidado.
          </p>
        </div>
        <Badge variant="outline">PERIODO {periodLabel}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Sucursal líder en ventas
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">
            {salesLeader?.name ?? "Sin ventas"}
          </p>
          <p className="number-display text-sm text-[color:var(--accent)]">
            {money.format(salesLeader?.sales ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Menor costo sobre venta
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">
            {efficientBranch?.name ?? "Sin dato comparable"}
          </p>
          <p className="number-display text-sm text-emerald-700">
            {efficientBranch
              ? percentage.format(efficientBranch.cost / efficientBranch.sales)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Peso del costo laboral
          </p>
          <p className="number-display mt-2 text-lg text-[color:var(--text-primary)]">
            {costRatio === null ? "—" : percentage.format(costRatio)}
          </p>
          <p className="text-xs text-[color:var(--text-muted)]">
            {money.format(totalCost)} sobre {money.format(totalSales)} en ventas
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <Card className="border-[color:var(--border-color)]">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-[color:var(--accent)]" />
                  Ventas frente a costo laboral
                </CardTitle>
                <CardDescription>
                  Evolución de los últimos seis meses hasta el periodo elegido.
                </CardDescription>
              </div>
              <Badge variant="outline">6 MESES</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="h-[300px] w-full"
              role="img"
              aria-label="Gráfica de ventas y costo laboral total de los últimos seis meses"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={trend}
                  margin={{ top: 18, right: 18, left: 4, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={chartColors.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    tickFormatter={(value) =>
                      compactMoney.format(Number(value))
                    }
                  />
                  <Tooltip
                    formatter={(value) => currencyTooltip(value as number)}
                    labelFormatter={(label) => `Periodo ${String(label)}`}
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: chartColors.grid,
                      backgroundColor: "var(--bg-card)",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="sales"
                    name="VENTAS"
                    fill={chartColors.sales}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={44}
                  />
                  <Line
                    dataKey="totalCost"
                    name="COSTO LABORAL"
                    type="monotone"
                    stroke={chartColors.payroll}
                    strokeWidth={3}
                    dot={{ r: 4, fill: chartColors.payroll }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[color:var(--border-color)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-[color:var(--accent)]" />
              Composición del costo
            </CardTitle>
            <CardDescription>{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {composition.length > 0 ? (
              <>
                <div
                  className="h-[210px] w-full"
                  role="img"
                  aria-label="Gráfica circular de composición del costo laboral entre nómina base, costo social e ISR"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={composition}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {composition.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => currencyTooltip(value as number)}
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: chartColors.grid,
                          backgroundColor: "var(--bg-card)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {composition.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex items-center gap-2 text-[color:var(--text-muted)]">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="number-display">
                        {money.format(item.value)} ·{" "}
                        {totalCost > 0
                          ? percentage.format(item.value / totalCost)
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-[color:var(--text-muted)]">
                No hay costos para el periodo seleccionado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[color:var(--border-color)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-[color:var(--accent)]" />
            Ventas y costo total por sucursal
          </CardTitle>
          <CardDescription>
            Comparativo ordenado por ventas; el costo conserva la misma carga
            por sucursal usada en reportes y conciliación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rankedBranches.length > 0 ? (
            <div
              className="h-[340px] w-full"
              role="img"
              aria-label="Gráfica comparativa horizontal de ventas y costo laboral total por sucursal"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rankedBranches}
                  layout="vertical"
                  margin={{ top: 12, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={chartColors.grid}
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    tickFormatter={(value) =>
                      compactMoney.format(Number(value))
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={118}
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => currencyTooltip(value as number)}
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: chartColors.grid,
                      backgroundColor: "var(--bg-card)",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="sales"
                    name="VENTAS"
                    fill={chartColors.sales}
                    radius={[0, 5, 5, 0]}
                  />
                  <Bar
                    dataKey="cost"
                    name="COSTO TOTAL"
                    fill={chartColors.payroll}
                    radius={[0, 5, 5, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-[color:var(--text-muted)]">
              No hay sucursales con ventas o costo para comparar.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
