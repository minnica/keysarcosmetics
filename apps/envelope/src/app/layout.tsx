import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Envelope — Control de Ventas',
  description: 'Sistema de control de ventas por sucursal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning evita el error de hidratación por el script de dark mode
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Google Fonts — Inter como fallback de Gilroy */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&display=swap"
          rel="stylesheet"
        />
        {/*
          Script anti-flash: aplica la preferencia de tema guardada ANTES del primer render
          para evitar parpadeo de light→dark al cargar la página
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('keysar-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  )
}
