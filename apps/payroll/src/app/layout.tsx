import type { Metadata } from "next";
import { BaseToaster, Toaster } from "@cosmetics/ui";
import { PilotGate } from "@/components/payroll/pilot-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Piloto de nómina · Keysar Cosmetics",
  description: "Administración de nómina de Keysar Cosmetics",
  robots: { index: false, follow: false },
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] antialiased">
        <PilotGate>{children}</PilotGate>
        <BaseToaster />
        <Toaster
          position="bottom-center"
          richColors
          toastOptions={{
            classNames: {
              toast: "font-sans",
              description: "opacity-80",
            },
          }}
        />
      </body>
    </html>
  );
}
