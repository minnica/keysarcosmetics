// Layout raíz de la aplicación landing
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cosmetics — Landing',
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
