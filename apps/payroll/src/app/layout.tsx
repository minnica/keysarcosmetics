import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prototipo de Nómina | Keysar Cosmetics',
  description: 'Lienzo de trabajo para diseñar la experiencia de nómina.',
  icons: { icon: '/logo.svg' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
