import { Bell, ClipboardList, HeartHandshake, UsersRound } from "lucide-react";

export const clientNavigationItems = [
  { label: "Base de clientes", href: "/clientes", icon: UsersRound },
  {
    label: "Recuperación de clientes",
    href: "/clientes/recuperacion",
    icon: HeartHandshake,
  },
  {
    label: "Reporte de encuestas",
    href: "/clientes/reporte-de-encuestas",
    icon: ClipboardList,
  },
  { label: "Recordatorios", href: "/clientes/recordatorios", icon: Bell },
] as const;
