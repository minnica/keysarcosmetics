import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function InformationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-keysar-linen text-keysar-text">
      <header className="border-b border-keysar-gold/25">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5 sm:px-8"
        >
          <Link href="/" className="flex items-center gap-3 font-title text-sm sm:text-lg">
            <Image src="/images/logo-keysar.svg" width={42} height={32} alt="" />
            Keysar Cosmetics
          </Link>
          <Link
            href="/#agenda"
            className="rounded-full border border-keysar-gold/45 px-4 py-2 text-sm font-semibold"
          >
            Solicitar cita
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">{children}</main>
      <footer className="border-t border-keysar-gold/25">
        <nav
          aria-label="Enlaces del pie de página"
          className="mx-auto flex max-w-4xl flex-wrap gap-x-6 gap-y-3 px-5 py-8 text-sm sm:px-8"
        >
          <Link href="/">Inicio</Link>
          <Link href="/#sucursales">Sucursales</Link>
          <Link href="/aviso-de-privacidad">Privacidad</Link>
          <Link href="/terminos-de-servicio">Términos de servicio</Link>
          <Link href="/cookies">Cookies</Link>
        </nav>
      </footer>
    </div>
  );
}
