import type { Metadata } from "next";
import "./globals.css";
import "./accounts.css";
import "./admin-menu.css";
import "./calendar-install.css";
import "./calendar-movements.css";
import "./management.css";
import "./shift-detail.css";
import "./login-authorizations.css";
import "./manual-schedule.css";
import "./weekly.css";
import "./master-login.css";
import "./share-invite.css";
import "./permission-portal.css";
import "./employee-access.css";
import "./employee-directory.css";
import "./employment-status.css";
import "./request-calendar-update.css";
import "./luxury-update.css";
import "./permissions-management.css";
import "./read-only-permissions.css";
import "./interface-settings.css";
import "./system-unified.css";
import "./people-experience.css";
import "./facialist-operations.css";
import "./employee-records.css";

export const metadata: Metadata = {
  title: "Roles de Personal Keysar",
  description: "Aplicación para crear roles de trabajo por sucursal.",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
