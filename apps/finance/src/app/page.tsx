'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, Building2, CalendarDays, ChevronLeft,
  ChevronRight, CircleDollarSign, CreditCard, FileBarChart, HandCoins, Landmark,
  LayoutDashboard, Menu, Moon, MoreHorizontal, Plus, ReceiptText, Search, Settings2,
  ShieldCheck, Sun, Users, WalletCards, X,
} from 'lucide-react';

type Section = 'inicio' | 'unidades' | 'rentas' | 'servicios' | 'pagos' | 'finanzas' | 'financiamientos' | 'socios' | 'aportaciones' | 'proyecciones' | 'accesos' | 'reportes';
type Unit = { id: string; code: string; name: string; area: string; status: 'Activa' | 'Pendiente'; rent: number; nextDue: string };

const navigation: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
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
  const [collapsed, setCollapsed] = useState(false);
  const [units, setUnits] = useState(initialUnits);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const active = navigation.find((item) => item.id === section) ?? navigation[0];
  const filteredUnits = useMemo(() => units.filter((unit) => `${unit.name} ${unit.code}`.toLowerCase().includes(search.toLowerCase())), [search, units]);
  const movePeriod = (amount: number) => { const date = new Date(`${period}-01T12:00:00`); date.setMonth(date.getMonth() + amount); setPeriod(date.toISOString().slice(0, 7)); };

  return <div className={`finance-shell ${dark ? 'dark' : ''}`}>
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand"><div className="brand-mark">K</div><div><strong>KEYSAR</strong><span>FINANCE</span></div></div>
      <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Contraer navegación">{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
      <nav aria-label="Navegación principal">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? 'active' : ''} onClick={() => { setSection(id); setSearch(''); }}><Icon size={18} /><span>{label}</span>{id === 'unidades' && <b>{units.length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="sidebar-action" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Modo claro' : 'Modo oscuro'}</span></button><div className="user-chip"><div>ER</div><span><strong>Emmanuel Rangel</strong><small>Administrador</small></span></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu" onClick={() => setCollapsed(!collapsed)} aria-label="Abrir menú"><Menu size={20} /></button><div className="period-control"><button onClick={() => movePeriod(-1)} aria-label="Periodo anterior"><ChevronLeft size={16} /></button><div><span>Periodo consultado</span><strong>{monthName(period)}</strong></div><button onClick={() => movePeriod(1)} aria-label="Periodo siguiente"><ChevronRight size={16} /></button></div><div className="topbar-spacer" /><span className="demo-label">Vista demo · datos simulados</span><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Cambiar tema">{dark ? <Sun size={18} /> : <Moon size={18} />}</button></header>
      <div className="content"><PageHeader section={active.label} title={active.id === 'inicio' ? 'Resumen financiero' : active.label} description={active.id === 'inicio' ? 'Una lectura clara del rendimiento financiero de tus sucursales.' : `Administra y consulta ${active.label.toLowerCase()} desde un solo lugar.`} onAdd={['unidades', 'servicios', 'socios', 'pagos'].includes(active.id) ? () => setShowForm(true) : undefined} />
        {section === 'inicio' ? <Dashboard units={units} setSection={setSection} /> : section === 'unidades' ? <Units units={filteredUnits} search={search} setSearch={setSearch} onAdd={() => setShowForm(true)} /> : <ModuleView section={active.label} />}
      </div>
    </main>
    {showForm && <MockForm title={`Nueva ${active.label.slice(0, -1).toLowerCase()}`} onClose={() => setShowForm(false)} onSave={(name) => { if (active.id === 'unidades') setUnits([...units, { id: `u${units.length + 30}`, code: `U-0${units.length + 30}`, name, area: 'Ciudad de México', status: 'Activa', rent: 0, nextDue: 'Por definir' }]); setShowForm(false); }} />}
  </div>;
}

function PageHeader({ section, title, description, onAdd }: { section: string; title: string; description: string; onAdd?: () => void }) { return <div className="page-header"><div><span className="eyebrow">{section.toUpperCase()}</span><h1>{title}</h1><p>{description}</p></div>{onAdd && <button className="primary-button" onClick={onAdd}><Plus size={17} /> Nuevo registro</button>}</div>; }

function Dashboard({ units, setSection }: { units: Unit[]; setSection: (section: Section) => void }) { const totalRent = units.reduce((sum, unit) => sum + unit.rent, 0); return <>
  <div className="hero-strip"><div><span className="eyebrow">AGOSTO 2026</span><h2>Tu operación, en equilibrio.</h2><p>Los ingresos mantienen una tendencia positiva y 3 de 4 sucursales están al corriente.</p></div><div className="hero-number"><small>Liquidez estimada</small><strong>{money(291700)}</strong><span><ArrowUpRight size={14} /> 4.8% vs. mes anterior</span></div></div>
  <div className="metric-grid"><Metric icon={<WalletCards />} label="Ingresos del mes" value={money(291700)} detail="+4.8% vs. julio" tone="green" /><Metric icon={<ReceiptText />} label="Compromisos" value={money(totalRent + 23600)} detail="Rentas y servicios" tone="purple" /><Metric icon={<CircleDollarSign />} label="Disponible" value={money(184500)} detail="Después de compromisos" tone="blue" /><Metric icon={<CalendarDays />} label="Próximo vencimiento" value="05 sep" detail="3 pagos programados" tone="amber" /></div>
  <div className="content-grid"><section className="panel chart-panel"><PanelTitle title="Flujo mensual" subtitle="Ingresos vs. compromisos" action="Ver finanzas" onAction={() => setSection('finanzas')} /><div className="chart-legend"><span><i className="legend-income" /> Ingresos</span><span><i className="legend-expense" /> Compromisos</span></div><div className="bars">{[58, 66, 62, 71, 77, 74, 84, 91].map((height, index) => <div className="bar-column" key={index}><div className="bar income" style={{ height: `${height}%` }} /><div className="bar expense" style={{ height: `${Math.max(20, height - 25)}%` }} /><small>{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'][index]}</small></div>)}</div></section><section className="panel"><PanelTitle title="Estado por sucursal" subtitle="Periodo actual" action="Ver sucursales" onAction={() => setSection('unidades')} /><div className="branch-list">{units.map((unit) => <div className="branch-row" key={unit.id}><div className="branch-avatar">{unit.name.slice(0, 1)}</div><div><strong>{unit.name}</strong><small>{unit.code}</small></div><span className={`status ${unit.status === 'Activa' ? 'ok' : 'warning'}`}>{unit.status}</span><MoreHorizontal size={18} /></div>)}</div></section></div>
  <section className="panel"><PanelTitle title="Actividad reciente" subtitle="Últimos movimientos registrados" action="Ver pagos" onAction={() => setSection('pagos')} /><div className="activity-table"><div className="table-head"><span>Concepto</span><span>Unidad</span><span>Fecha</span><span className="align-right">Importe</span></div>{[['Renta mensual', 'MITIKAH VIP', '05 ago 2026', 84200], ['Servicio de internet', 'OPATRA', '03 ago 2026', 499], ['Aportación de capital', 'PARQUE DELTA', '01 ago 2026', 25000]].map(([concept, branch, date, value]) => <div className="table-row" key={concept as string}><div><strong>{concept}</strong><small>Pago confirmado</small></div><span>{branch}</span><span>{date}</span><strong className="align-right">{money(value as number)}</strong></div>)}</div></section>
</>; }
function Metric({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) { return <article className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function PanelTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) { return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-button" onClick={onAction}>{action}<ChevronRight size={15} /></button>}</div>; }
function Units({ units, search, setSearch, onAdd }: { units: Unit[]; search: string; setSearch: (value: string) => void; onAdd: () => void }) { return <section className="panel"><div className="toolbar"><div className="search-box"><Search size={17} /><input aria-label="Buscar sucursal" placeholder="Buscar sucursal" value={search} onChange={(event) => setSearch(event.target.value)} /></div><button className="secondary-button" onClick={onAdd}><Plus size={16} /> Agregar sucursal</button></div><div className="unit-grid">{units.map((unit) => <article className="unit-card" key={unit.id}><div className="unit-card-top"><div className="branch-avatar large">{unit.name.slice(0, 1)}</div><span className={`status ${unit.status === 'Activa' ? 'ok' : 'warning'}`}>{unit.status}</span></div><span className="unit-code">{unit.code}</span><h3>{unit.name}</h3><p>{unit.area}</p><div className="unit-detail"><span>Renta mensual</span><strong>{money(unit.rent)}</strong></div><div className="unit-detail"><span>Próximo vencimiento</span><strong>{unit.nextDue}</strong></div></article>)}</div>{units.length === 0 && <div className="empty-state"><Search size={24} /><p>No encontramos sucursales con ese filtro.</p></div>}</section>; }
function ModuleView({ section }: { section: string }) { return <section className="panel module-view"><div className="module-icon"><BarChart3 size={22} /></div><h2>{section} en modo demo</h2><p>Esta vista ya está conectada al shell de Finance y lista para recibir sus agregados de backend. Por ahora muestra información mock para validar la experiencia y la arquitectura de navegación.</p><div className="summary-strip"><div><span>Registros visibles</span><strong>24</strong></div><div><span>Última actualización</span><strong>Hoy, 09:42</strong></div><div><span>Estado</span><strong className="positive">Sincronizado</strong></div></div><button className="primary-button"><FileBarChart size={16} /> Explorar reporte demo</button></section>; }
function MockForm({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: (name: string) => void }) { const [name, setName] = useState(''); return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button><span className="eyebrow">DATOS MOCK</span><h2>{title}</h2><p>El registro se conservará en memoria mientras esta sesión esté abierta.</p><label>Nombre<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. REFORMA" /></label><div className="form-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!name.trim()} onClick={() => onSave(name.trim())}>Guardar registro</button></div></section></div>; }
