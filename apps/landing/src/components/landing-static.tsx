import { defaultWhatsAppUrl } from "@/lib/contact";
import Image from "next/image";

const locations = [
  {
    name: "Sucursal Masaryk",
    address:
      "Presidente Masaryk 407, Polanco III Secc, Miguel Hidalgo, 11540 CDMX",
    mapUrl: "https://maps.app.goo.gl/F1WFQTv1jn2vUycj6",
  },
  {
    name: "Keysar Cosmétics Mítikah Luxury",
    address:
      "Av. Río Churubusco 601, Centro Comercial Mítikah, Mezzanine PB, Benito Juárez, CDMX",
    mapUrl: "https://maps.app.goo.gl/H9raXcMT46Mbsk5R7",
  },
  {
    name: "Parque Delta Beauty Córner",
    address:
      "Av. Cuauhtémoc 462, Piedad Narvarte, Benito Juárez, 03000, CDMX — Local K17",
    mapUrl: "https://maps.app.goo.gl/ca9VwBwbok2Dqv9E8",
  },
  {
    name: "Opatra Galería Insurgentes",
    address: "Galería Insurgentes, Ciudad de México",
    mapUrl: "https://maps.app.goo.gl/fG5fEZa4ZTY1ibYH6",
  },
] as const;

function UserIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3a8.8 8.8 0 0 0-7.6 13.2L3.4 21l4.9-1.3A8.8 8.8 0 1 0 12 3Zm0 15.9c-1.3 0-2.6-.4-3.7-1l-.3-.2-2.1.6.6-2-.2-.3A7.1 7.1 0 1 1 12 18.9Zm4-5.3c-.2-.1-1.3-.7-1.5-.7s-.4-.1-.6.1c-.2.2-.7.7-.8.8-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

export function Navbar() {
  return (
    <header className="absolute left-0 top-0 z-30 w-full">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-10"
        aria-label="Navegación principal"
      >
        <a
          href="#inicio"
          aria-label="Keysar Cosmetics"
          className="inline-flex items-center"
        >
          <Image
            src="/images/logo-keysar.svg"
            alt="Keysar Cosmetics"
            width={210}
            height={48}
            className="h-8 w-auto md:h-9"
            priority
          />
        </a>
        <div className="hidden items-center gap-1 rounded-full border border-white/35 bg-white/30 p-1 text-sm font-semibold text-keysar-dark shadow-[0_12px_35px_rgba(36,31,26,0.08)] backdrop-blur-md md:flex">
          <a
            href="#conocenos"
            className="rounded-full px-4 py-2 transition hover:bg-white/45 hover:text-keysar-gold"
          >
            Conócenos
          </a>
          <a
            href="#servicios"
            className="rounded-full px-4 py-2 transition hover:bg-white/45 hover:text-keysar-gold"
          >
            Servicios
          </a>
          <a
            href="#agenda"
            className="rounded-full px-4 py-2 transition hover:bg-white/45 hover:text-keysar-gold"
          >
            Agendar cita
          </a>
          <a
            href="#agenda"
            aria-label="Ir a agendar cita"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/30 text-keysar-dark transition hover:border-keysar-gold hover:bg-white/55 hover:text-keysar-gold"
          >
            <UserIcon />
          </a>
        </div>
        <details className="group relative md:hidden">
          <summary
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/45 bg-white/30 text-keysar-dark shadow-[0_10px_28px_rgba(36,31,26,0.08)] backdrop-blur-md"
            aria-label="Abrir menú"
          >
            <svg
              className="h-5 w-5 group-open:hidden"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            <svg
              className="hidden h-5 w-5 group-open:block"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </summary>
          <div className="absolute right-0 top-12 w-56 rounded-2xl border border-white/45 bg-white/90 p-3 text-sm font-medium text-keysar-text shadow-lg backdrop-blur-md">
            <a
              href="#conocenos"
              className="block rounded-xl px-4 py-3 transition hover:bg-keysar-cream"
            >
              Conócenos
            </a>
            <a
              href="#servicios"
              className="block rounded-xl px-4 py-3 transition hover:bg-keysar-cream"
            >
              Servicios
            </a>
            <a
              href="#agenda"
              className="block rounded-xl px-4 py-3 transition hover:bg-keysar-cream"
            >
              Agendar cita
            </a>
          </div>
        </details>
      </nav>
    </header>
  );
}

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative isolate overflow-hidden bg-keysar-cream"
    >
      <Image
        src="/images/hero-keysar-brand.png"
        alt="Keysar Cosmetics, cuidado en cada detalle"
        fill
        sizes="100vw"
        className="absolute inset-0 z-0 object-cover object-[66%_42%]"
        priority
      />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(247,241,232,0.82)_0%,rgba(247,241,232,0.62)_28%,rgba(247,241,232,0.08)_54%,rgba(247,241,232,0)_100%)]" />
      <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl items-center px-5 pt-20 md:min-h-[640px] md:px-10 md:pt-16 lg:min-h-[590px]">
        <div className="max-w-[470px] pb-8 md:pb-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-keysar-gold">
            Spa &amp; facial care
          </p>
          <h1 className="mt-4 font-title text-[42px] leading-[1.02] text-white drop-shadow-[0_2px_12px_rgba(74,64,56,0.22)] sm:text-6xl lg:text-7xl">
            Keysar
            <br />
            Cosmetics
          </h1>
          <div className="mt-6 max-w-md space-y-4 text-sm leading-7 text-keysar-text sm:text-base md:mt-8 md:text-sm">
            <p>
              Un ritual de bienestar donde la piel respira, se ilumina y
              recupera su esencia natural.
            </p>
            <p>
              Masajes y tratamientos faciales premium diseñados para realzar tu
              belleza desde el equilibrio y la calma.
            </p>
          </div>
          <a
            href="#servicios"
            className="mt-7 inline-flex rounded-full border border-keysar-text/30 bg-white/10 px-5 py-3 text-sm font-medium text-keysar-text transition hover:border-keysar-gold hover:bg-white/30 hover:text-keysar-dark md:px-6"
          >
            Explorar tratamientos
          </a>
        </div>
      </div>
    </section>
  );
}

export function EssenceSection() {
  return (
    <section
      id="conocenos"
      className="ks-section-a px-5 py-16 sm:px-6 md:px-10 md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-2xl">
        <h2 className="font-title text-4xl leading-tight tracking-[-0.03em] text-keysar-text md:text-5xl">
          Nuestra esencia
        </h2>
        <div className="mt-10 space-y-6 text-base leading-8 text-keysar-text md:text-[17px]">
          <p>
            En Keysar Cosmetics redefinimos el cuidado estético desde una visión
            sofisticada y consciente.
          </p>
          <p>
            Cada tratamiento está diseñado para armonizar piel, cuerpo y
            bienestar, combinando técnica profesional con una experiencia
            sensorial única.
          </p>
          <p>
            Creamos un espacio donde el detalle, la calma y la elegancia se
            convierten en parte de tu ritual personal.
          </p>
        </div>
      </div>
    </section>
  );
}

export function LocationsSection() {
  return (
    <section className="ks-section-b px-5 py-16 sm:px-6 md:px-10 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-title text-3xl leading-tight tracking-[-0.03em] text-keysar-text sm:text-4xl md:text-5xl">
            Vive la experiencia Keysar
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-keysar-text">
            Encuentra la ubicación más cercana y disfruta de un ambiente íntimo,
            sofisticado y relajante en cada una de nuestras sucursales.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-8">
          {locations.map((location) => (
            <article
              key={location.name}
              className="group flex flex-col items-center rounded-[4px] border border-keysar-gold/25 bg-keysar-linen px-8 py-10 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-keysar-gold/40 text-keysar-gold">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div
                className="mt-5 h-px w-10 bg-keysar-gold/50"
                aria-hidden="true"
              />
              <h3 className="mt-5 font-title text-xl leading-snug text-keysar-dark">
                {location.name}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-6 text-keysar-gray">
                {location.address}
              </p>
              <a
                href={location.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-keysar-gold transition hover:text-keysar-text"
              >
                Ver en Google Maps <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CallToAction() {
  return (
    <section className="ks-section-c px-6 py-20 text-center md:px-10 lg:py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-title text-3xl leading-tight tracking-[-0.03em] text-keysar-dark sm:text-4xl md:text-5xl">
          Empieza hoy tu ritual de bienestar
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-keysar-text">
          Nuestro equipo está listo para escucharte, conocer tus necesidades y
          ayudarte a elegir el tratamiento ideal para tu piel, tu cuerpo y tu
          momento personal.
        </p>
        <a
          href="#agenda"
          className="mt-8 inline-flex rounded-full bg-keysar-gold px-7 py-3 text-sm font-semibold text-white transition hover:bg-keysar-dark"
        >
          Quiero agendar mi cita
        </a>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-keysar-dark px-6 pt-16 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 border-b border-white/10 pb-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a
              href="#inicio"
              aria-label="Keysar Cosmetics"
              className="inline-flex"
            >
              <Image
                src="/images/logo-keysar.svg"
                alt="Keysar Cosmetics"
                width={280}
                height={64}
                className="h-12 w-auto"
              />
            </a>
            <p className="mt-6 max-w-sm text-sm leading-7 text-white/65">
              Belleza, bienestar y cuidado estético desde una experiencia
              sofisticada, personalizada y consciente.
            </p>
            <div className="mt-7 flex items-center gap-4 text-white/70">
              <a
                href="https://www.instagram.com/keysarcosmetics/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="transition hover:text-white"
              >
                Instagram
              </a>
              <a
                href={defaultWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="transition hover:text-white"
              >
                <WhatsAppIcon />
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Servicios</h3>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              <li>
                <a href="#servicios" className="hover:text-white">
                  Faciales
                </a>
              </li>
              <li>
                <a href="#servicios" className="hover:text-white">
                  Corporales
                </a>
              </li>
              <li>
                <a href="#servicios" className="hover:text-white">
                  Tratamientos premium
                </a>
              </li>
              <li>
                <a href="#agenda" className="hover:text-white">
                  Agenda tu cita
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Sucursales</h3>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              {locations.map((location) => (
                <li key={location.name}>
                  <a
                    href={location.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-white"
                  >
                    {location.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Contacto</h3>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              <li>
                <a
                  href={defaultWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  +52 55 8056 1135
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/keysarcosmetics/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  @keysarcosmetics
                </a>
              </li>
              <li className="leading-6">
                Lun – Dom
                <br />
                11:00 – 20:00
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-4 py-7 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Keysar Cosmetics. Todos los derechos
            reservados.
          </p>
          <div className="flex flex-wrap gap-5">
            <a href="#" className="hover:text-white">
              Política de Privacidad
            </a>
            <a href="#" className="hover:text-white">
              Términos de Servicio
            </a>
            <a href="#" className="hover:text-white">
              Configuración de Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppButton() {
  return (
    <a
      href={defaultWhatsAppUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Enviar mensaje por WhatsApp a Keysar Cosmetics"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 md:bottom-7 md:right-7 md:h-16 md:w-16"
    >
      <WhatsAppIcon className="h-7 w-7 md:h-8 md:w-8" />
    </a>
  );
}
