'use client';

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import {
  ArrowUpRight, BarChart3, Building2, CalendarDays, ChevronLeft, ChevronRight,
  CircleDollarSign, CreditCard, FileBarChart, HandCoins, Landmark, LayoutDashboard,
  Moon, MoreHorizontal, Plus, ReceiptText, Search, Settings2, ShieldCheck, Sun,
  Users, WalletCards,
} from 'lucide-react';
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Input, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Separator, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent,
  TabsList, TabsTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useSidebar,
} from '@cosmetics/ui';

type Section = 'inicio' | 'unidades' | 'rentas' | 'servicios' | 'pagos' | 'finanzas' | 'financiamientos' | 'socios' | 'aportaciones' | 'proyecciones' | 'accesos' | 'reportes';
type UnitStatus = 'Activa' | 'Pendiente';
type Unit = { id: string; code: string; name: string; area: string; status: UnitStatus; rent: number; nextDue: string };

const navigation: { id: Section; label: string; icon: ElementType }[] = [
  { id: 'inicio', label: 'Resumen', icon: LayoutDashboard }, { id: 'unidades', label: 'Sucursales', icon: Building2 },
  { id: 'rentas', label: 'Rentas', icon: ReceiptText }, { id: 'servicios', label: 'Servicios', icon: Settings2 },
  { id: 'pagos', label: 'Pagos', icon: CreditCard }, { id: 'finanzas', label: 'Estado financiero', icon: BarChart3 },
  { id: 'financiamientos', label: 'Financiamientos', icon: Landmark }, { id: 'socios', label: 'Socios', icon: Users },
  { id: 'aportaciones', label: 'Aportaciones', icon: HandCoins }, { id: 'proyecciones', label: 'Proyecciones', icon: ArrowUpRight },
  { id: 'accesos', label: 'Usuarios y accesos', icon: ShieldCheck }, { id: 'reportes', label: 'Reportes', icon: FileBarChart },
];
const initialUnits: Unit[] = [
  { id: 'u28', code: 'U-028', name: 'MITIKAH VIP', area: 'Ciudad de México', status: 'Activa', rent: 84200, nextDue: '05 sep 2026' },
  { id: 'u27', code: 'U-027', name: 'OPATRA', area: 'Ciudad de México', status: 'Activa', rent: 73800, nextDue: '05 sep 2026' },
  { id: 'u25', code: 'U-025', name: 'PARQUE DELTA', area: 'Ciudad de México', status: 'Activa', rent: 69300, nextDue: '05 sep 2026' },
  { id: 'u26', code: 'U-026', name: 'MASARYK', area: 'Ciudad de México', status: 'Pendiente', rent: 64100, nextDue: '08 sep 2026' },
];
const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
const monthName = (period: string) => new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T12:00:00`));

export default function FinancePage() {
  const [section, setSection] = useState<Section>('inicio');
  const [period, setPeriod] = useState('2026-08');
  const [dark, setDark] = useState(false);
  const [units, setUnits] = useState(initialUnits);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const active = navigation.find((item) => item.id === section) ?? navigation[0];
  const filteredUnits = useMemo(() => units.filter((unit) => `${unit.name} ${unit.code} ${unit.area}`.toLowerCase().includes(search.toLowerCase())), [search, units]);

  useEffect(() => {
    const isDark = window.localStorage.getItem('keysar-finance-theme') === 'dark';
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    return () => document.documentElement.classList.remove('dark');
  }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem('keysar-finance-theme', next ? 'dark' : 'light');
  }
  function movePeriod(amount: number) {
    const date = new Date(`${period}-01T12:00:00`);
    date.setMonth(date.getMonth() + amount);
    setPeriod(date.toISOString().slice(0, 7));
  }
  function selectSection(next: Section) { setSection(next); setSearch(''); }

  return (
    <SidebarProvider>
      <FinanceSidebar section={section} unitsCount={units.length} dark={dark} onThemeToggle={toggleTheme} onSelect={selectSection} />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <Topbar period={period} dark={dark} onMovePeriod={movePeriod} onThemeToggle={toggleTheme} />
        <div className="finance-content">
          <PageHeader title={active.id === 'inicio' ? 'Resumen financiero' : active.label} description={active.id === 'inicio' ? 'Una lectura clara del rendimiento y los compromisos de todas tus sucursales.' : `Administra y consulta ${active.label.toLowerCase()} desde un solo lugar.`} onAdd={['unidades', 'servicios', 'socios', 'pagos'].includes(active.id) ? () => setShowForm(true) : undefined} />
          {section === 'inicio' ? <Dashboard units={units} setSection={selectSection} /> : section === 'unidades' ? <UnitsTable units={filteredUnits} search={search} setSearch={setSearch} onAdd={() => setShowForm(true)} /> : <ModuleView section={active.label} />}
        </div>
      </SidebarInset>
      <NewUnitDialog open={showForm} onOpenChange={setShowForm} onSave={(unit) => setUnits((current) => [...current, unit])} />
    </SidebarProvider>
  );
}

function FinanceSidebar({ section, unitsCount, dark, onThemeToggle, onSelect }: { section: Section; unitsCount: number; dark: boolean; onThemeToggle: () => void; onSelect: (section: Section) => void }) {
  const { setOpenMobile } = useSidebar();
  return <Sidebar collapsible="icon">
    <SidebarHeader className="finance-sidebar-header"><div className="finance-brand"><div className="finance-brand-mark">K</div><div className="finance-brand-copy"><strong>KEYSAR</strong><span>FINANCE</span></div><SidebarTrigger className="finance-sidebar-trigger" /></div></SidebarHeader>
    <SidebarContent><SidebarGroup><SidebarGroupLabel>OPERACIÓN FINANCIERA</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>
      {navigation.map(({ id, label, icon: Icon }) => <SidebarMenuItem key={id}><SidebarMenuButton isActive={section === id} tooltip={label} onClick={() => { onSelect(id); setOpenMobile(false); }}><Icon aria-hidden="true" /><span>{label}</span></SidebarMenuButton>{id === 'unidades' ? <SidebarMenuBadge>{unitsCount}</SidebarMenuBadge> : null}</SidebarMenuItem>)}
    </SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
    <SidebarFooter><Separator className="mb-1" /><SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip={dark ? 'Modo claro' : 'Modo oscuro'} onClick={onThemeToggle}>{dark ? <Sun /> : <Moon />}<span>{dark ? 'Modo claro' : 'Modo oscuro'}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu><div className="finance-user"><div className="finance-user-avatar">ER</div><div><strong>Emmanuel Rangel</strong><span>Administrador</span></div></div></SidebarFooter><SidebarRail />
  </Sidebar>;
}

function Topbar({ period, dark, onMovePeriod, onThemeToggle }: { period: string; dark: boolean; onMovePeriod: (amount: number) => void; onThemeToggle: () => void }) {
  return <header className="finance-topbar"><SidebarTrigger className="md:hidden" /><div className="period-control"><Button variant="ghost" size="icon" onClick={() => onMovePeriod(-1)} aria-label="Periodo anterior"><ChevronLeft /></Button><div><span>Periodo consultado</span><strong>{monthName(period)}</strong></div><Button variant="ghost" size="icon" onClick={() => onMovePeriod(1)} aria-label="Periodo siguiente"><ChevronRight /></Button></div><Badge variant="secondary" className="demo-badge">Vista demo · datos simulados</Badge><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onThemeToggle} aria-label="Cambiar tema">{dark ? <Sun /> : <Moon />}</Button></TooltipTrigger><TooltipContent>{dark ? 'Usar tema claro' : 'Usar tema oscuro'}</TooltipContent></Tooltip></TooltipProvider></header>;
}

function PageHeader({ title, description, onAdd }: { title: string; description: string; onAdd?: () => void }) {
  return <div className="page-header"><div><h1 className="page-title">{title}</h1><p>{description}</p></div>{onAdd ? <Button onClick={onAdd}><Plus /> Nuevo registro</Button> : null}</div>;
}

function Dashboard({ units, setSection }: { units: Unit[]; setSection: (section: Section) => void }) {
  const totalRent = units.reduce((sum, unit) => sum + unit.rent, 0);
  return <div className="dashboard-stack">
    <Card className="balance-card"><CardContent className="balance-content"><div className="balance-lead"><span>LIQUIDEZ ESTIMADA · AGOSTO 2026</span><strong>{money(291700)}</strong><p><ArrowUpRight /> 4.8% por encima del mes anterior</p></div><div className="balance-metrics"><SummaryMetric icon={<WalletCards />} label="Ingresos" value={money(291700)} /><SummaryMetric icon={<ReceiptText />} label="Compromisos" value={money(totalRent + 23600)} /><SummaryMetric icon={<CircleDollarSign />} label="Disponible" value={money(184500)} /><SummaryMetric icon={<CalendarDays />} label="Próximo pago" value="05 sep" /></div></CardContent></Card>
    <div className="dashboard-grid">
      <Card><CardHeader className="card-heading-row"><div><CardTitle>Flujo mensual</CardTitle><CardDescription>Ingresos contra compromisos</CardDescription></div><Button variant="ghost" size="sm" onClick={() => setSection('finanzas')}>Ver finanzas <ChevronRight /></Button></CardHeader><CardContent><div className="chart-legend"><span><i className="legend-income" />Ingresos</span><span><i className="legend-expense" />Compromisos</span></div><div className="bars" aria-label="Comparación de flujo mensual">{[58, 66, 62, 71, 77, 74, 84, 91].map((height, index) => <div className="bar-column" key={index}><div className="bar income" style={{ height: `${height}%` }} /><div className="bar expense" style={{ height: `${Math.max(20, height - 25)}%` }} /><small>{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'][index]}</small></div>)}</div></CardContent></Card>
      <Card><CardHeader className="card-heading-row"><div><CardTitle>Estado por sucursal</CardTitle><CardDescription>Seguimiento del periodo actual</CardDescription></div><Button variant="ghost" size="sm" onClick={() => setSection('unidades')}>Ver todas <ChevronRight /></Button></CardHeader><CardContent className="branch-list">{units.map((unit) => <div className="branch-row" key={unit.id}><div className="branch-avatar">{unit.name.slice(0, 1)}</div><div><strong>{unit.name}</strong><span>{unit.code}</span></div><StatusBadge status={unit.status} /><Button variant="ghost" size="icon" aria-label={`Más acciones para ${unit.name}`}><MoreHorizontal /></Button></div>)}</CardContent></Card>
    </div>
    <Card><CardHeader className="card-heading-row"><div><CardTitle>Actividad reciente</CardTitle><CardDescription>Últimos movimientos registrados</CardDescription></div><Button variant="ghost" size="sm" onClick={() => setSection('pagos')}>Ver pagos <ChevronRight /></Button></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Sucursal</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Importe</TableHead></TableRow></TableHeader><TableBody>{[['Renta mensual', 'MITIKAH VIP', '05 ago 2026', 84200], ['Servicio de internet', 'OPATRA', '03 ago 2026', 499], ['Aportación de capital', 'PARQUE DELTA', '01 ago 2026', 25000]].map(([concept, branch, date, value]) => <TableRow key={concept as string}><TableCell><strong>{concept}</strong><span className="cell-note">Pago confirmado</span></TableCell><TableCell>{branch}</TableCell><TableCell>{date}</TableCell><TableCell className="number-display text-right font-semibold">{money(value as number)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  </div>;
}

function SummaryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="summary-metric"><span>{icon}{label}</span><strong>{value}</strong></div>; }
function StatusBadge({ status }: { status: UnitStatus }) { return <Badge variant="outline" className={status === 'Activa' ? 'status-active' : 'status-pending'}>{status}</Badge>; }

function UnitsTable({ units, search, setSearch, onAdd }: { units: Unit[]; search: string; setSearch: (value: string) => void; onAdd: () => void }) {
  return <Card><CardHeader className="table-toolbar"><div className="search-field"><Search aria-hidden="true" /><Input aria-label="Buscar sucursal" placeholder="Buscar por nombre, código o ciudad" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Button variant="outline" onClick={onAdd}><Plus /> Agregar sucursal</Button></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Sucursal</TableHead><TableHead>Ubicación</TableHead><TableHead>Estado</TableHead><TableHead>Próximo vencimiento</TableHead><TableHead className="text-right">Renta mensual</TableHead><TableHead className="w-12"><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader><TableBody>
    {units.map((unit) => <TableRow key={unit.id}><TableCell><div className="branch-cell"><div className="branch-avatar">{unit.name.slice(0, 1)}</div><div><strong>{unit.name}</strong><span>{unit.code}</span></div></div></TableCell><TableCell>{unit.area}</TableCell><TableCell><StatusBadge status={unit.status} /></TableCell><TableCell>{unit.nextDue}</TableCell><TableCell className="number-display text-right font-semibold">{money(unit.rent)}</TableCell><TableCell><Button variant="ghost" size="icon" aria-label={`Más acciones para ${unit.name}`}><MoreHorizontal /></Button></TableCell></TableRow>)}
    {units.length === 0 ? <TableRow><TableCell colSpan={6}><div className="empty-state"><Search /><strong>Sin coincidencias</strong><span>Prueba con otro nombre, código o ciudad.</span></div></TableCell></TableRow> : null}
  </TableBody></Table></CardContent></Card>;
}

function ModuleView({ section }: { section: string }) {
  return <Tabs defaultValue="resumen"><TabsList><TabsTrigger value="resumen">Resumen</TabsTrigger><TabsTrigger value="actividad">Actividad</TabsTrigger></TabsList><TabsContent value="resumen"><Card><CardHeader><div className="module-icon"><BarChart3 /></div><CardTitle>{section} en modo demo</CardTitle><CardDescription>La estructura visual está lista para recibir los agregados del backend sin cambiar el flujo de navegación.</CardDescription></CardHeader><CardContent><div className="module-summary"><div><span>Registros visibles</span><strong>24</strong></div><div><span>Última actualización</span><strong>Hoy, 09:42</strong></div><div><span>Estado</span><StatusBadge status="Activa" /></div></div><div className="progress-block"><div><span>Datos preparados</span><strong>72%</strong></div><Progress value={72} /></div><Button><FileBarChart /> Explorar reporte demo</Button></CardContent></Card></TabsContent><TabsContent value="actividad"><Card><CardHeader><CardTitle>Actividad reciente</CardTitle><CardDescription>Los movimientos aparecerán aquí cuando el módulo se conecte al backend.</CardDescription></CardHeader><CardContent><div className="empty-state"><ReceiptText /><strong>Aún no hay movimientos</strong><span>La actividad del módulo se mostrará en orden cronológico.</span></div></CardContent></Card></TabsContent></Tabs>;
}

function NewUnitDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (unit: Unit) => void }) {
  const [name, setName] = useState('');
  const [area, setArea] = useState('Ciudad de México');
  const [status, setStatus] = useState<UnitStatus>('Activa');
  function save() {
    const cleanName = name.trim(); if (!cleanName) return;
    const nextNumber = Math.floor(Date.now() / 1000).toString().slice(-3);
    onSave({ id: `u${nextNumber}`, code: `U-${nextNumber}`, name: cleanName.toUpperCase(), area, status, rent: 0, nextDue: 'Por definir' });
    setName(''); setArea('Ciudad de México'); setStatus('Activa'); onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Nueva sucursal</DialogTitle><DialogDescription>Registro temporal para validar el flujo de Finance. Se conservará durante esta sesión.</DialogDescription></DialogHeader><div className="dialog-fields"><div><Label htmlFor="unit-name">Nombre</Label><Input id="unit-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Reforma" /></div><div><Label htmlFor="unit-area">Ubicación</Label><Input id="unit-area" value={area} onChange={(event) => setArea(event.target.value)} /></div><div><Label htmlFor="unit-status">Estado</Label><Select value={status} onValueChange={(value) => setStatus(value as UnitStatus)}><SelectTrigger id="unit-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Activa">Activa</SelectItem><SelectItem value="Pendiente">Pendiente</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!name.trim()} onClick={save}>Guardar sucursal</Button></DialogFooter></DialogContent></Dialog>;
}
