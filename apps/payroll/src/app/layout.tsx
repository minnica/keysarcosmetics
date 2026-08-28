import type { Metadata } from "next";
import { BaseToaster, Toaster } from "@cosmetics/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keysar Cosmetics — Payroll",
  description: "Administración de nómina de Keysar Cosmetics",
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
        {children}
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
