import type { Metadata } from 'next'
import { Toaster } from '@cosmetics/ui'
import './globals.css'

export const metadata: Metadata = {
  title: 'Keysar Cosmetics — Payroll',
  description: 'Demo frontend de administracion de nomina',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
