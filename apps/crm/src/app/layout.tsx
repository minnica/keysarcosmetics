// Layout raíz de la aplicación crm
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cosmetics — Crm',
  description: 'Plataforma de cosméticos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
