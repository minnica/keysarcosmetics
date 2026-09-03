import {
  Banknote,
  BookOpenCheck,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Building2,
  CalendarHeart,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  CloudDownload,
  DoorClosed,
  Gauge,
  Globe2,
  LogOut,
  Menu,
  PanelLeftClose,
  PackagePlus,
  ContactRound,
  Crown,
  Pin,
  PinOff,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Trophy,
  UserRoundCog,
  UsersRound,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import type { ScreenId } from "../types";

interface NavigationItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
  color: string;
}

const navigationIconStyle = (color: string) =>
  ({ "--navigation-icon": color }) as CSSProperties;

const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Gauge, color: "#9b6841" },
  { id: "sale", label: "Ventas", icon: ShoppingBag, color: "#20201f" },
  {
    id: "appointments",
    label: "Citas",
    icon: CalendarHeart,
    color: "#c78494",
  },
  {
    id: "memberships",
    label: "Membresías",
    icon: Crown,
    color: "#b18455",
  },
  { id: "inventory", label: "Inventory", icon: Boxes, color: "#d97562" },
  { id: "x-report", label: "X-Report", icon: ClipboardList, color: "#242321" },
  { id: "reports", label: "Reports", icon: BarChart3, color: "#a17452" },
  {
    id: "cash-manager",
    label: "Cash manager",
    icon: Banknote,
    color: "#86a95c",
  },
  { id: "employees", label: "Employees", icon: UserRoundCog, color: "#2b2926" },
  { id: "competition", label: "Competition", icon: Trophy, color: "#a17b45" },
  { id: "websites", label: "Websites", icon: Globe2, color: "#637e8b" },
  {
    id: "data-update",
    label: "Data update",
    icon: CloudDownload,
    color: "#70716f",
  },
  { id: "settings", label: "Settings", icon: Settings2, color: "#6b9bb8" },
  { id: "clock-in", label: "Clock In", icon: Clock3, color: "#4b9a70" },
];

const utilityNavigationIds: ScreenId[] = [
  "data-update",
  "settings",
  "clock-in",
];
const primaryNavigationItems = navigationItems.filter(
  (item) => !utilityNavigationIds.includes(item.id),
);
const utilityNavigationItems = navigationItems.filter((item) =>
  utilityNavigationIds.includes(item.id),
);

const saleNavigationItems: NavigationItem[] = [
  {
    id: "sale",
    label: "Ventas",
    icon: ShoppingBag,
    color: "#20201f",
  },
  {
    id: "seller-sales",
    label: "Mis ventas",
    icon: BarChart3,
    color: "#9c744e",
  },
  {
    id: "receipts",
    label: "Receipts",
    icon: ReceiptText,
    color: "#3a9ac7",
  },
  {
    id: "customers",
    label: "Customers",
    icon: UsersRound,
    color: "#c89856",
  },
  {
    id: "catalog",
    label: "Catálogo",
    icon: BookOpenCheck,
    color: "#8b6f54",
  },
  {
    id: "close-day",
    label: "Close day",
    icon: DoorClosed,
    color: "#d46f5d",
  },
];

const inventoryNavigationItems: NavigationItem[] = [
  {
    id: "inventory",
    label: "Inventario",
    icon: Boxes,
    color: "#d97562",
  },
  {
    id: "warehouse",
    label: "Pedido sucursales",
    icon: Warehouse,
    color: "#9a6a45",
  },
  {
    id: "branch-inventory",
    label: "Almacén matriz",
    icon: Building2,
    color: "#8a785e",
  },
  {
    id: "suppliers",
    label: "Proveedores",
    icon: ContactRound,
    color: "#8f6b50",
  },
  {
    id: "inventory-movements",
    label: "Movimientos",
    icon: ArrowLeftRight,
    color: "#7a8c72",
  },
  {
    id: "deals",
    label: "Paquetes y promociones",
    icon: PackagePlus,
    color: "#b07a47",
  },
];

const navigationLabelsEnglish: Partial<Record<ScreenId, string>> = {
  dashboard: "Dashboard",
  sale: "Sale",
  "seller-sales": "My sales",
  receipts: "Receipts",
  customers: "Customers",
  appointments: "Appointments",
  memberships: "Memberships",
  inventory: "Inventory",
  warehouse: "Warehouse",
  "branch-inventory": "Branch inventory",
  suppliers: "Suppliers",
  catalog: "Catalog",
  "inventory-movements": "Movements",
  deals: "Deals",
  "x-report": "X-Report",
  reports: "Reports",
  "cash-manager": "Cash manager",
  employees: "Employees",
  competition: "Competition",
  websites: "Websites",
  "data-update": "Data update",
  settings: "Settings",
  "clock-in": "Clock In",
  "close-day": "Close day",
};

const navigationLabel = (item: NavigationItem, language: "ES" | "EN") =>
  language === "EN" ? navigationLabelsEnglish[item.id] ?? item.label : item.label;

interface PosSidebarProps {
  activeScreen: ScreenId;
  activeBranch: string;
  collapsed: boolean;
  pinned: boolean;
  allowedScreens: ScreenId[];
  cartCount: number;
  canExitWithoutCloseDay: boolean;
  language: "ES" | "EN";
  onNavigate: (screen: ScreenId) => void;
  onRequestSessionExit: () => void;
  onRequestLocationSwitch: () => void;
  onToggle: () => void;
  onTogglePin: () => void;
}

export function PosSidebar({
  activeScreen,
  activeBranch,
  collapsed,
  pinned,
  allowedScreens,
  cartCount,
  canExitWithoutCloseDay,
  language,
  onNavigate,
  onRequestSessionExit,
  onRequestLocationSwitch,
  onToggle,
  onTogglePin,
}: PosSidebarProps) {
  const saleIsActive = saleNavigationItems.some(
    (item) => item.id === activeScreen,
  );
  const inventoryIsActive = inventoryNavigationItems.some(
    (item) => item.id === activeScreen,
  );
  const [saleMenuOpen, setSaleMenuOpen] = useState(saleIsActive);
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(inventoryIsActive);
  const visiblePrimaryNavigationItems = primaryNavigationItems.filter(
    (item) =>
      allowedScreens.includes(item.id) ||
      (item.id === "sale" && saleNavigationItems.some((child) => allowedScreens.includes(child.id))) ||
      (item.id === "inventory" && inventoryNavigationItems.some((child) => allowedScreens.includes(child.id))),
  );

  useEffect(() => {
    if (saleIsActive) {
      setSaleMenuOpen(true);
      setInventoryMenuOpen(false);
    }
  }, [saleIsActive]);

  useEffect(() => {
    if (inventoryIsActive) {
      setInventoryMenuOpen(true);
      setSaleMenuOpen(false);
    }
  }, [inventoryIsActive]);

  return (
    <aside className={`pos-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">
          <img src="./logo.svg" alt="" />
        </div>
        {!collapsed && (
          <div className="brand-copy">
            <span className="brand-name">KEYSAR</span>
            <span className="brand-caption">COSMETICS · RETAIL</span>
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
        <button
          className={`sidebar-pin ${pinned ? "is-pinned" : ""}`}
          type="button"
          onClick={onTogglePin}
          aria-label={pinned ? "Liberar menú automático" : "Fijar menú abierto"}
          title={pinned ? "Menú fijado · liberar" : "Fijar menú para que no se contraiga"}
          aria-pressed={pinned}
        >
          {pinned ? <PinOff size={15} /> : <Pin size={15} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label={language === "EN" ? "Main navigation" : "Navegación principal"}>
        {!collapsed && <span className="sidebar-section-label">{language === "EN" ? "OPERATIONS" : "OPERACIÓN"}</span>}
        {visiblePrimaryNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeScreen;
          if (item.id === "sale") {
            return (
              <div
                key={item.id}
                className={`sidebar-nav-group ${saleIsActive ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className={`sidebar-item ${saleIsActive ? "is-active" : ""}`}
                  onClick={() => {
                    if (collapsed) {
                      setSaleMenuOpen(true);
                      setInventoryMenuOpen(false);
                      onToggle();
                      return;
                    }
                    const next = !saleMenuOpen;
                    setSaleMenuOpen(next);
                    if (next) setInventoryMenuOpen(false);
                  }}
                  aria-expanded={!collapsed ? saleMenuOpen : undefined}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? navigationLabel(item, language) : undefined}
                >
                  <span className="sidebar-icon" style={navigationIconStyle(item.color)}>
                    <Icon size={24} strokeWidth={1.65} />
                  </span>
                  {!collapsed && <span>{navigationLabel(item, language)}</span>}
                  {cartCount > 0 && (
                    <span className="sidebar-count">{cartCount}</span>
                  )}
                  {!collapsed && (
                    <span className="sidebar-group-chevron">
                      {saleMenuOpen ? (
                        <ChevronDown size={15} />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </span>
                  )}
                </button>
                {!collapsed && saleMenuOpen && (
                  <div className="sidebar-submenu" aria-label={language === "EN" ? "Sale views" : "Opciones de Ventas"}>
                    {saleNavigationItems.filter((child) => allowedScreens.includes(child.id)).map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = child.id === activeScreen;
                      return (
                        <button
                          key={child.id}
                          type="button"
                          className={childActive ? "is-active" : ""}
                          onClick={() => onNavigate(child.id)}
                          aria-current={childActive ? "page" : undefined}
                        >
                          <span
                            className="sidebar-submenu-icon"
                            style={navigationIconStyle(child.color)}
                          >
                            <ChildIcon size={14} strokeWidth={1.75} />
                          </span>
                          <span>{navigationLabel(child, language)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          if (item.id === "inventory") {
            return (
              <div
                key={item.id}
                className={`sidebar-nav-group ${inventoryIsActive ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className={`sidebar-item ${inventoryIsActive ? "is-active" : ""}`}
                  onClick={() => {
                    const canOpenInventory = allowedScreens.includes("inventory");
                    if (canOpenInventory) onNavigate("inventory");
                    if (!canOpenInventory && collapsed) {
                      setInventoryMenuOpen(true);
                      setSaleMenuOpen(false);
                      onToggle();
                      return;
                    }
                    if (!collapsed) {
                      const next = !inventoryMenuOpen;
                      setInventoryMenuOpen(next);
                      if (next) setSaleMenuOpen(false);
                    }
                  }}
                  aria-expanded={!collapsed ? inventoryMenuOpen : undefined}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? navigationLabel(item, language) : undefined}
                >
                  <span className="sidebar-icon" style={navigationIconStyle(item.color)}>
                    <Icon size={24} strokeWidth={1.65} />
                  </span>
                  {!collapsed && <span>{navigationLabel(item, language)}</span>}
                  {!collapsed && (
                    <span className="sidebar-group-chevron">
                      {inventoryMenuOpen ? (
                        <ChevronDown size={15} />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </span>
                  )}
                </button>
                {!collapsed && inventoryMenuOpen && (
                  <div
                    className="sidebar-submenu"
                    aria-label={language === "EN" ? "Inventory views" : "Ventanas de Inventory"}
                  >
                    {inventoryNavigationItems.filter((child) => allowedScreens.includes(child.id)).map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = child.id === activeScreen;
                      return (
                        <button
                          key={child.id}
                          type="button"
                          className={childActive ? "is-active" : ""}
                          onClick={() => onNavigate(child.id)}
                          aria-current={childActive ? "page" : undefined}
                        >
                          <span
                            className="sidebar-submenu-icon"
                            style={navigationIconStyle(child.color)}
                          >
                            <ChildIcon size={14} strokeWidth={1.75} />
                          </span>
                          <span>{navigationLabel(child, language)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${isActive ? "is-active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? navigationLabel(item, language) : undefined}
            >
              <span className="sidebar-icon" style={navigationIconStyle(item.color)}>
                <Icon size={24} strokeWidth={1.65} />
              </span>
              {!collapsed && <span>{navigationLabel(item, language)}</span>}
            </button>
          );
        })}
      </nav>

      <nav className="sidebar-utility-nav" aria-label={language === "EN" ? "System and attendance" : "Sistema y asistencia"}>
        {!collapsed && <span className="sidebar-section-label">{language === "EN" ? "SYSTEM" : "SISTEMA"}</span>}
        {utilityNavigationItems.filter((item) => allowedScreens.includes(item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeScreen;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${isActive ? "is-active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? navigationLabel(item, language) : undefined}
            >
              <span className="sidebar-icon" style={navigationIconStyle(item.color)}>
                <Icon size={18} strokeWidth={1.7} />
              </span>
              {!collapsed && <span>{navigationLabel(item, language)}</span>}
            </button>
          );
        })}
        {canExitWithoutCloseDay && (
          <button
            type="button"
            className="sidebar-item sidebar-session-exit-button"
            onClick={onRequestSessionExit}
            aria-label={language === "EN" ? "Sign out without Close day" : "Salir sin realizar Close day"}
            title={language === "EN" ? "Sign out without Close day" : "Salir sin realizar Close day"}
          >
            <span
              className="sidebar-icon"
              style={navigationIconStyle("#c97863")}
            >
              <LogOut size={18} strokeWidth={1.7} />
            </span>
            {!collapsed && (
              <span className="sidebar-session-exit-copy">
                <strong>{language === "EN" ? "Sign out" : "Salir"}</strong>
                <small>{language === "EN" ? "Without Close day" : "Sin Close day"}</small>
              </span>
            )}
          </button>
        )}
      </nav>

      <div className="sidebar-status">
        <Gauge size={17} />
        {!collapsed && (
          <div>
            <strong>{language === "EN" ? "Location" : "Sucursal"} {activeBranch}</strong>
            <span>{language === "EN" ? "Fixed location" : "Ubicación fija"} · Terminal 01</span>
          </div>
        )}
        <button
          type="button"
          className="sidebar-location-switch"
          onClick={onRequestLocationSwitch}
          aria-label={`Cambiar ubicación actual: ${activeBranch}`}
          title="Cambiar sucursal · requiere usuario master"
        >
          <ArrowLeftRight size={16} />
        </button>
      </div>
    </aside>
  );
}
