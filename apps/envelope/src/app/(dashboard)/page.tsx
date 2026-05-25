"use client";
// Dashboard principal — Cards de resumen + gráficas Recharts
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@cosmetics/ui";
import { Input } from "@cosmetics/ui";
import { Label } from "@cosmetics/ui";
import { useSucursales, useEmpleados, useVentas } from "@/hooks";
import { formatCurrency, formatDate, todayISO, monthName } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Paleta de sucursales con colores complementarios de la marca
const SUCURSAL_COLORS = ["#6fc9db", "#8bb09b", "#c3a583", "#648672"];

// Acento por período: gold → sage → blue-light (paleta de marca)
const PERIODO_STYLES = [
  { accent: "#c3a583" }, // día — gold
  { accent: "#8bb09b" }, // mes — green-sage
  { accent: "#6fc9db" }, // año — blue-light
];

export default function DashboardPage() {
  const { sucursales, loading: lS } = useSucursales();
  const { empleados, loading: lE } = useEmpleados();
  const { registros, loading: lV } = useVentas();
  const loading = lS || lE || lV;

  const [selectedDate, setSelectedDate] = useState(todayISO());

  const selectedDateObj = new Date(selectedDate + "T00:00:00");
  const selYear = selectedDateObj.getFullYear();
  const selMonth = selectedDateObj.getMonth() + 1;
  const selMonthPrefix = `${selYear}-${String(selMonth).padStart(2, "0")}`;
  const selYearPrefix = String(selYear);

  function sumForSucursal(
    sucursalId: string,
    dateFilter: (fecha: string) => boolean,
  ): number {
    return registros
      .filter((r) => r.sucursalId === sucursalId && dateFilter(r.fecha))
      .flatMap((r) => r.items)
      .reduce((s, i) => s + i.cantidad, 0);
  }

  function totalForPeriod(dateFilter: (fecha: string) => boolean): number {
    return registros
      .filter((r) => dateFilter(r.fecha))
      .flatMap((r) => r.items)
      .reduce((s, i) => s + i.cantidad, 0);
  }

  const periodos = [
    { label: "Ventas del día", filter: (f: string) => f === selectedDate },
    {
      label: `Ventas del mes`,
      filter: (f: string) => f.startsWith(selMonthPrefix),
    },
    {
      label: `Ventas del año`,
      filter: (f: string) => f.startsWith(selYearPrefix),
    },
  ];

  const monthsData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(selYear, selMonth - 1 - (5 - i), 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = monthName(d.getFullYear(), d.getMonth() + 1)
      .slice(0, 3)
      .toUpperCase();
    const entry: Record<string, string | number> = { mes: label };
    sucursales.forEach((s) => {
      entry[s.nombre] = registros
        .filter((r) => r.sucursalId === s.id && r.fecha.startsWith(prefix))
        .flatMap((r) => r.items)
        .reduce((acc, item) => acc + item.cantidad, 0);
    });
    return entry;
  });

  const vendedoresData = empleados
    .filter((emp) => emp.metaIndividual != null && emp.metaIndividual > 0)
    .map((emp) => {
      const totalVendido = registros
        .filter(
          (r) => r.vendedorId === emp.id && r.fecha.startsWith(selMonthPrefix),
        )
        .flatMap((r) => r.items)
        .reduce((s, i) => s + i.cantidad, 0);
      return {
        nombre: emp.nombreCompleto.split(" ")[0] ?? emp.nombreCompleto,
        vendido: totalVendido,
        meta: emp.metaIndividual,
      };
    })
    .sort((a, b) => b.vendido - a.vendido);

  const formatK = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        Cargando datos...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title font-semibold uppercase">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Resumen de ventas —{" "}
            {formatDate(selectedDate, "EEEE d 'de' MMMM yyyy")}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha-dashboard">Fecha de referencia</Label>
          <Input
            id="fecha-dashboard"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* ── Cards de resumen por período ── 1 card por período, 3 cols desktop / 1 col mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {periodos.map(({ label, filter }, periodIdx) => {
          const { accent } = (PERIODO_STYLES[periodIdx] ?? PERIODO_STYLES[0])!;
          return (
            <Card
              key={label}
              style={{
                backgroundColor: "var(--bg-card)",
                borderTop: `3px solid ${accent}`,
                borderLeft: "1px solid var(--border-color)",
                borderRight: "1px solid var(--border-color)",
                borderBottom: "1px solid var(--border-color)",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <CardHeader className="pb-2 pt-5 px-5">
                <p
                  className="text-[14px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                {sucursales.map((s) => {
                  const total = sumForSucursal(s.id, filter);
                  return (
                    <div
                      key={s.id}
                      className="flex justify-between items-center gap-4"
                    >
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {s.nombre}
                      </span>
                      <span
                        className="text-sm font-medium tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(total)}
                      </span>
                    </div>
                  );
                })}
                <div
                  className="flex justify-between items-end pt-3 mt-1 border-t"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span
                    className="text-[14px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Total
                  </span>
                  <span
                    className="text-2xl font-bold tabular-nums leading-none"
                    style={{ color: accent }}
                  >
                    {formatCurrency(totalForPeriod(filter))}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Gráfica 1: Total mensual por sucursal ── */}
      <section>
        <h2 className="label-caps mb-3">Total mensual por sucursal</h2>
        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthsData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                />
                <YAxis
                  tickFormatter={formatK}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
                />
                {sucursales.map((s, i) => (
                  <Bar
                    key={s.id}
                    dataKey={s.nombre}
                    fill={SUCURSAL_COLORS[i % SUCURSAL_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ── Gráfica 2: Vendedor vs Meta ── */}
      <section>
        <h2 className="label-caps mb-3">Avance vendedores del mes</h2>
        <Card>
          <CardContent className="pt-6">
            {vendedoresData.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <p className="text-sm font-medium">Sin vendedores con meta asignada</p>
                <p className="text-xs">
                  Asigna una meta individual en el módulo de empleados para ver el avance.
                </p>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(200, vendedoresData.length * 52)}
              >
                <BarChart
                  data={vendedoresData}
                  layout="vertical"
                  margin={{ top: 5, right: 60, left: 60, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatK}
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                    width={60}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as {
                        nombre: string;
                        vendido: number;
                        meta: number;
                      };
                      const pct =
                        d.meta > 0 ? Math.round((d.vendido / d.meta) * 100) : 0;
                      return (
                        <div
                          style={{
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "10px",
                            color: "var(--text-primary)",
                            fontSize: "12px",
                            padding: "10px 14px",
                            lineHeight: "1.8",
                          }}
                        >
                          <p className="font-semibold mb-1">{d.nombre}</p>
                          <p>Vendido: {formatCurrency(d.vendido)}</p>
                          <p style={{ color: "var(--text-muted)" }}>
                            Meta: {formatCurrency(d.meta)}
                          </p>
                          <p
                            style={{
                              color:
                                pct < 50
                                  ? "#d4895a"
                                  : pct < 80
                                    ? "#c3a583"
                                    : "#648672",
                              fontWeight: 600,
                            }}
                          >
                            {pct}% alcanzado
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
                  />
                  {/* Barra de meta */}
                  <Bar
                    dataKey="meta"
                    fill="#f3f0e9"
                    name="Meta"
                    radius={[0, 4, 4, 0]}
                  />
                  {/* Barra de vendido */}
                  <Bar dataKey="vendido" name="Vendido" fill="#ecd1c8" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="vendido"
                      position="right"
                      style={{ fontSize: 11, fill: "var(--text-muted)" }}
                      formatter={(v: number, entry: unknown) => {
                        const d = entry as { meta?: number };
                        if (!d?.meta || d.meta === 0) return "";
                        return `${Math.round((v / d.meta) * 100)}%`;
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
