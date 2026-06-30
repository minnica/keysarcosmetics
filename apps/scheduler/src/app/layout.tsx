import type { Metadata } from 'next'
import { Toaster } from '@cosmetics/ui'
import './globals.css'

export const metadata: Metadata = {
  title: 'Keysar Scheduler',
  description: 'Agenda interna para operaciones y reservas de Keysar Cosmetics.',
  icons: { icon: '/logo.svg' },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
