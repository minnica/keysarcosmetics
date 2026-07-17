"use client";
// Dashboard principal — Cards de resumen + gráficas Recharts
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Card,
  CardHeader,
  CardContent,
  DatePicker,
  Input,
  ProgressKeysar,
} from "@cosmetics/ui";
import { Label } from "@cosmetics/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate, todayISO, monthName } from "@/lib/utils";
import { DashboardLoadingSkeleton } from "@/components/layout/DataLoadingSkeleton";

// Paleta de sucursales con colores complementarios de la marca
const SUCURSAL_COLORS = ["#6fc9db", "#8bb09b", "#c3a583", "#648672"];

// Acento por período: gold → sage → blue-light (paleta de marca)
const PERIODO_STYLES = [
  { accent: "#c3a583" }, // día — gold
  { accent: "#8bb09b" }, // mes — green-sage
  { accent: "#6fc9db" }, // año — blue-light
];

interface DashboardBranchTotal {
  sucursalId: string;
  sucursalNombre: string;
  total: number;
}

interface DashboardMonthTotal {
  year: number;
  month: number;
  totals: DashboardBranchTotal[];
}

interface DashboardSellerTotal {
  empleadoId: string;
  nombre: string;
  vendido: number;
  meta: number;
}

interface DashboardData {
  dia: DashboardBranchTotal[];
  mes: DashboardBranchTotal[];
  anio: DashboardBranchTotal[];
  monthsData: DashboardMonthTotal[];
  ventasPorVendedor: DashboardSellerTotal[];
}

function abbreviateBranchName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length > 1
    ? `${words[0]} ${words.slice(1).map((word) => `${word.charAt(0)}.`).join(" ")}`
    : name;
}

export default function DashboardPage() {
  const { locale, t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellerSearch, setSellerSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<{ success: boolean; data: DashboardData }>(
          "/api/envelope/reportes/dashboard",
          { params: { fecha: selectedDate } },
        );
        if (!cancelled) {
          setDashboardData(data.data);
        }
      } catch {
        if (!cancelled) {
          setError(t.common.loadingData);
          setDashboardData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, t.common.loadingData]);

  const sucursales = dashboardData?.anio.map((row) => ({
    id: row.sucursalId,
    nombre: row.sucursalNombre,
  })) ?? [];

  const periodos = [
    { label: t.dashboard.dailySales, rows: dashboardData?.dia ?? [] },
    { label: t.dashboard.monthlySales, rows: dashboardData?.mes ?? [] },
    { label: t.dashboard.yearlySales, rows: dashboardData?.anio ?? [] },
  ];

  const monthsData = (dashboardData?.monthsData ?? []).map((period) => {
    const label = monthName(period.year, period.month, locale)
      .slice(0, 3)
      .toUpperCase();
    const entry: Record<string, string | number> = { mes: label };
    period.totals.forEach((row) => {
      entry[row.sucursalNombre] = row.total;
    });
    return entry;
  });

  const vendedoresData = (dashboardData?.ventasPorVendedor ?? [])
    .filter((emp) => emp.meta > 0)
    .sort((a, b) => b.vendido - a.vendido);
  const sellersSummary = vendedoresData.reduce(
    (summary, seller) => ({
      vendido: summary.vendido + seller.vendido,
      meta: summary.meta + seller.meta,
    }),
    { vendido: 0, meta: 0 },
  );
  const sellersProgress = sellersSummary.meta > 0
    ? (sellersSummary.vendido / sellersSummary.meta) * 100
    : 0;
  const mobileSellers = vendedoresData.filter((seller) =>
    seller.nombre.toLowerCase().includes(sellerSearch.trim().toLowerCase()),
  );
  const monthlyBranches = [...(dashboardData?.mes ?? [])]
    .sort((a, b) => b.total - a.total);
  const monthlyTotal = monthlyBranches.reduce((sum, branch) => sum + branch.total, 0);

  const formatK = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title font-semibold uppercase">{t.dashboard.title}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {t.dashboard.salesSummary} —{" "}
            {formatDate(selectedDate, locale === 'en' ? "EEEE, MMMM d yyyy" : "EEEE d 'de' MMMM yyyy", locale)}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha-dashboard">{t.dashboard.referenceDate}</Label>
          <DatePicker
            id="fecha-dashboard"
            value={selectedDate}
            onChange={setSelectedDate}
            className="w-44"
            placeholder={t.dashboard.referenceDate}
          />
        </div>
      </div>

      {/* ── Cards de resumen por período ── 1 card por período, 3 cols desktop / 1 col mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {periodos.map(({ label, rows }, periodIdx) => {
          const { accent } = (PERIODO_STYLES[periodIdx] ?? PERIODO_STYLES[0])!;
          const totalPeriod = rows.reduce((sum, row) => sum + row.total, 0);
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
                  const total = rows.find((row) => row.sucursalId === s.id)?.total ?? 0;
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
                    {t.common.total}
                  </span>
                  <span
                    className="text-2xl font-bold tabular-nums leading-none"
                    style={{ color: accent }}
                  >
                    {formatCurrency(totalPeriod)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Gráfica 1: Total mensual por sucursal ── */}
      <section>
        <h2 className="label-caps mb-3">{t.dashboard.monthlyTotalByBranch}</h2>
        <div className="md:hidden">
          <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {formatDate(selectedDate, "MMMM yyyy", locale)}
              </div>
              <div className="mt-1 number-display text-xl">{formatCurrency(monthlyTotal)}</div>
            </CardHeader>
            <CardContent className="px-2 pb-4 pt-2">
              {monthlyBranches.length === 0 ? (
                <p className="py-4 text-center text-sm text-[color:var(--text-muted)]">Sin ventas en el mes seleccionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={310}>
                  <BarChart data={monthlyBranches} margin={{ top: 18, right: 8, left: -16, bottom: 54 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis
                      dataKey="sucursalNombre"
                      interval={0}
                      angle={-38}
                      textAnchor="end"
                      height={60}
                      tickFormatter={abbreviateBranchName}
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                    />
                    <YAxis tickFormatter={formatK} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => label}
                      contentStyle={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "10px",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="total" name={t.common.total} radius={[4, 4, 0, 0]}>
                      {monthlyBranches.map((branch, index) => (
                        <Cell key={branch.sucursalId} fill={SUCURSAL_COLORS[index % SUCURSAL_COLORS.length]} />
                      ))}
                      <LabelList dataKey="total" position="top" style={{ fontSize: 9, fill: "var(--text-muted)" }} formatter={formatK} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="hidden md:block">
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
        <h2 className="label-caps mb-3">{t.dashboard.sellersMonthlyProgress}</h2>
        {vendedoresData.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div
                className="flex flex-col items-center justify-center py-12 gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <p className="text-sm font-medium">{t.dashboard.noSellersWithGoal}</p>
                <p className="text-xs">
                  {t.dashboard.assignGoalHint}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">AVANCE GLOBAL</div>
                      <div className="mt-1 number-display text-2xl">{sellersProgress.toFixed(0)}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t.dashboard.sold}</div>
                      <div className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(sellersSummary.vendido)}</div>
                    </div>
                  </div>
                  <ProgressKeysar value={sellersProgress} className="mt-3" />
                  <div className="mt-2 flex justify-between text-xs text-[color:var(--text-muted)]">
                    <span>{vendedoresData.length} VENDEDORES CON META</span>
                    <span>{t.dashboard.goal}: {formatCurrency(sellersSummary.meta)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-1.5">
                <Label htmlFor="buscar-vendedor-dashboard" className="text-xs uppercase tracking-[0.12em]">BUSCAR EMPLEADO</Label>
                <Input
                  id="buscar-vendedor-dashboard"
                  value={sellerSearch}
                  onChange={(event) => setSellerSearch(event.target.value)}
                  placeholder="Escribe el nombre del vendedor"
                  className="h-11 border-[color:var(--border-color)] bg-[var(--bg-card)]"
                />
              </div>

              <div className="space-y-3">
                {mobileSellers.map((seller) => {
                  const progress = seller.meta > 0 ? (seller.vendido / seller.meta) * 100 : 0;
                  const remaining = Math.max(0, seller.meta - seller.vendido);
                  const progressColor = progress < 50 ? "text-red-600" : progress < 80 ? "text-yellow-600" : "text-green-600";

                  return (
                    <Card key={seller.empleadoId} className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                      <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold">{seller.nombre}</h3>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t.dashboard.sold}</div>
                          <div className="mt-1 number-display text-lg">{formatCurrency(seller.vendido)}</div>
                        </div>
                        <span className={`shrink-0 text-lg font-semibold tabular-nums ${progressColor}`}>{progress.toFixed(0)}%</span>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        <ProgressKeysar value={progress} />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t.dashboard.goal}</div>
                            <div className="mt-1 text-sm font-medium tabular-nums">{formatCurrency(seller.meta)}</div>
                          </div>
                          <div className="rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">POR LLEGAR</div>
                            <div className="mt-1 text-sm font-medium tabular-nums">{formatCurrency(remaining)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {mobileSellers.length === 0 && (
                  <p className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                    No hay empleados que coincidan con la búsqueda.
                  </p>
                )}
              </div>
            </div>

            <Card className="hidden md:block">
              <CardContent className="pt-6">
              <ResponsiveContainer
                width="100%"
                height={Math.max(200, vendedoresData.length * 52)}
              >
                <BarChart
                  data={vendedoresData}
                  layout="vertical"
                  margin={{ top: 5, right: 58, left: 0, bottom: 5 }}
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
                    width={150}
                    tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => (
                      <text x={x} y={y} dy={4} textAnchor="end" fill="var(--text-muted)" fontSize={11}>
                        {payload.value}
                      </text>
                    )}
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
                          <p>{t.dashboard.sold}: {formatCurrency(d.vendido)}</p>
                          <p style={{ color: "var(--text-muted)" }}>
                            {t.dashboard.goal}: {formatCurrency(d.meta)}
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
                            {pct}% {t.dashboard.reached}
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
                    name={t.dashboard.goal}
                    radius={[0, 4, 4, 0]}
                  />
                  {/* Barra de vendido */}
                  <Bar dataKey="vendido" name={t.dashboard.sold} fill="#ecd1c8" radius={[0, 4, 4, 0]}>
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
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
