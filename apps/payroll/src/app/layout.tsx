import type { Metadata } from "next";
import { BaseToaster, Toaster } from "@cosmetics/ui";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keysar Cosmetics — Payroll",
  description: "Administración de nómina de Keysar Cosmetics",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('keysar-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] antialiased">
        <SessionProvider>{children}</SessionProvider>
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
