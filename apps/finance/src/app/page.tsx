'use client';

import { useEffect, useState, type ElementType } from 'react';
import {
  ArrowUpRight, BarChart3, Building2, ChevronLeft, ChevronRight, CreditCard,
  FileBarChart, HandCoins, Landmark, LayoutDashboard, Moon, ReceiptText,
  Settings2, ShieldCheck, Sun, Users,
} from 'lucide-react';
import {
  Badge, Button,
  Separator, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useSidebar,
} from '@cosmetics/ui';
import { FinanceDashboard, FinanceModulePage, initialFinanceMocks, type FinanceMocks, type Section } from '../components/finance-pages';

const navigation: { id: Section; label: string; icon: ElementType }[] = [
  { id: 'inicio', label: 'Resumen', icon: LayoutDashboard }, { id: 'unidades', label: 'Sucursales', icon: Building2 },
  { id: 'rentas', label: 'Rentas', icon: ReceiptText }, { id: 'servicios', label: 'Servicios', icon: Settings2 },
  { id: 'pagos', label: 'Pagos', icon: CreditCard }, { id: 'finanzas', label: 'Estado financiero', icon: BarChart3 },
  { id: 'financiamientos', label: 'Financiamientos', icon: Landmark }, { id: 'socios', label: 'Socios', icon: Users },
  { id: 'aportaciones', label: 'Aportaciones', icon: HandCoins }, { id: 'proyecciones', label: 'Proyecciones', icon: ArrowUpRight },
  { id: 'accesos', label: 'Usuarios y accesos', icon: ShieldCheck }, { id: 'reportes', label: 'Reportes', icon: FileBarChart },
];
const monthName = (period: string) => new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T12:00:00`));

export default function FinancePage() {
  const [section, setSection] = useState<Section>('inicio');
  const [period, setPeriod] = useState('2026-08');
  const [dark, setDark] = useState(false);
  const [mocks, setMocks] = useState<FinanceMocks>(initialFinanceMocks);

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
  function selectSection(next: Section) { setSection(next); }

  return (
    <SidebarProvider>
      <FinanceSidebar section={section} unitsCount={mocks.units.length} dark={dark} onThemeToggle={toggleTheme} onSelect={selectSection} />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <Topbar period={period} dark={dark} onMovePeriod={movePeriod} onThemeToggle={toggleTheme} />
        <div className="finance-content">
          {section === 'inicio' ? <FinanceDashboard mocks={mocks} period={period} setSection={selectSection} /> : <FinanceModulePage section={section} mocks={mocks} period={period} setMocks={setMocks} />}
        </div>
      </SidebarInset>
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
