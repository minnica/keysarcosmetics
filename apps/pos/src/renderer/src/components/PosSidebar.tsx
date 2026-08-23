import {
  Banknote,
  BookOpenCheck,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  CalendarHeart,
  ClipboardList,
  CloudDownload,
  DoorClosed,
  Gauge,
  Globe2,
  Menu,
  PanelLeftClose,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Trophy,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ScreenId } from "../types";

interface NavigationItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
  color: string;
}

const navigationItems: NavigationItem[] = [
  { id: "sale", label: "Sale", icon: ShoppingBag, color: "#20201f" },
  {
    id: "seller-sales",
    label: "Mis ventas",
    icon: BarChart3,
    color: "#9c744e",
  },
  { id: "receipts", label: "Receipts", icon: ReceiptText, color: "#3a9ac7" },
  { id: "customers", label: "Customers", icon: UsersRound, color: "#c89856" },
  {
    id: "appointments",
    label: "Citas",
    icon: CalendarHeart,
    color: "#c78494",
  },
  { id: "inventory", label: "Inventory", icon: Boxes, color: "#d97562" },
  { id: "catalog", label: "Catálogo", icon: BookOpenCheck, color: "#8b6f54" },
  {
    id: "inventory-movements",
    label: "Mov. inventario",
    icon: ArrowLeftRight,
    color: "#7a8c72",
  },
  { id: "settings", label: "Settings", icon: Settings2, color: "#6b9bb8" },
  { id: "x-report", label: "X-Report", icon: ClipboardList, color: "#242321" },
  {
    id: "cash-manager",
    label: "Cash manager",
    icon: Banknote,
    color: "#86a95c",
  },
  { id: "close-day", label: "Close day", icon: DoorClosed, color: "#d46f5d" },
  { id: "employees", label: "Employees", icon: UserRoundCog, color: "#2b2926" },
  { id: "competition", label: "Competition", icon: Trophy, color: "#a17b45" },
  { id: "websites", label: "Websites", icon: Globe2, color: "#637e8b" },
  {
    id: "data-update",
    label: "Data update",
    icon: CloudDownload,
    color: "#70716f",
  },
];

interface PosSidebarProps {
  activeScreen: ScreenId;
  collapsed: boolean;
  cartCount: number;
  onNavigate: (screen: ScreenId) => void;
  onToggle: () => void;
}

export function PosSidebar({
  activeScreen,
  collapsed,
  cartCount,
  onNavigate,
  onToggle,
}: PosSidebarProps) {
  return (
    <aside className={`pos-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">
          <img src="/logo.svg" alt="" />
        </div>
        {!collapsed && (
          <div>
            <span className="brand-name">KEYSAR</span>
            <span className="brand-caption">RETAIL POS</span>
          </div>
        )}
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Mostrar menú" : "Ocultar menú"}
          title={collapsed ? "Mostrar menú" : "Ocultar menú"}
        >
          {collapsed ? <Menu size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeScreen;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${isActive ? "is-active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-icon" style={{ color: item.color }}>
                <Icon size={22} strokeWidth={1.8} />
              </span>
              {!collapsed && <span>{item.label}</span>}
              {item.id === "sale" && cartCount > 0 && (
                <span className="sidebar-count">{cartCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-status">
        <Gauge size={17} />
        {!collapsed && (
          <div>
            <strong>Sucursal Polanco</strong>
            <span>Terminal conectada · Mock</span>
          </div>
        )}
      </div>
    </aside>
  );
}
