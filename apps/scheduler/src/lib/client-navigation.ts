import { Bell, ClipboardList, UsersRound } from "lucide-react";

export const clientNavigationItems = [
  { label: "Base de clientes", href: "/clientes", icon: UsersRound },
  {
    label: "Reporte de encuestas",
    href: "/clientes/reporte-de-encuestas",
    icon: ClipboardList,
  },
  { label: "Recordatorios", href: "/clientes/recordatorios", icon: Bell },
] as const;
