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
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
