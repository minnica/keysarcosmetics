import type { Metadata } from "next";
import { Toaster } from "@cosmetics/ui";
import { SchedulerRuntime } from "@scheduler/runtime";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keysar Scheduler",
  description:
    "Agenda interna para operaciones y reservas de Keysar Cosmetics.",
  icons: { icon: "/logo.svg" },
  other: {
    "keysar-release":
      process.env["KEYSAR_RELEASE_SHA"] ??
      process.env["VERCEL_GIT_COMMIT_SHA"] ??
      "local",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <SchedulerRuntime>{children}</SchedulerRuntime>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
