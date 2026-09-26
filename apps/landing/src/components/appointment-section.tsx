"use client";

import { whatsappPhoneNumber } from "@/lib/contact";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const services = { facial: "Facial", corporal: "Corporal" } as const;
const branches = {
  "sucursal-1": "Sucursal Masaryk",
  "sucursal-2": "Keysar Cosmétics Mítikah Luxury",
  "sucursal-3": "Sucursal Parque Delta Beauty Córner",
  "sucursal-4": "Opatra Galería Insurgentes",
} as const;

export function AppointmentSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<keyof typeof services | "">("");
  const [branch, setBranch] = useState<keyof typeof branches | "">("");
  const [coupon, setCoupon] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const couponShownRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || couponShownRef.current) return;
        couponShownRef.current = true;
        setCouponOpen(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!couponOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCouponOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [couponOpen]);

  const whatsappUrl = useMemo(() => {
    const message = [
      "Hola, quiero agendar una cita en Keysar Cosmetics.",
      name.trim() ? `Mi nombre es ${name.trim()}.` : "",
      service ? `Servicio de interés: ${services[service]}.` : "",
      branch ? `Sucursal: ${branches[branch]}.` : "",
      phone.trim() ? `Mi teléfono es +52 ${phone.trim()}.` : "",
      coupon
        ? "Quiero aprovechar el beneficio KEYSAR15: 15% de cortesía en un segundo tratamiento."
        : "",
      "Quedo al pendiente de su confirmación.",
    ]
      .filter(Boolean)
      .join(" ");
    return `https://wa.me/${whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
  }, [branch, coupon, name, phone, service]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const acceptCoupon = () => {
    setCoupon(true);
    setCouponOpen(false);
    window.requestAnimationFrame(() => nameRef.current?.focus());
  };

  return (
    <>
      <section
        ref={sectionRef}
        id="agenda"
        className="ks-section-d px-5 py-20 sm:px-6 md:px-10 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 xl:gap-24">
            <div className="lg:max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-keysar-gold">
                Reserva tu momento
              </p>
              <h2 className="mt-4 font-title text-4xl leading-tight tracking-[-0.02em] text-keysar-dark sm:text-5xl">
                Agenda tu
                <br className="hidden sm:block" /> experiencia
              </h2>
              <div
                className="mt-6 h-px w-14 bg-keysar-gold/60"
                aria-hidden="true"
              />
              <p className="mt-6 text-base leading-8 text-keysar-text">
                Una asesora especializada se pondrá en contacto contigo para
                personalizar cada detalle de tu visita y elegir el tratamiento
                ideal para ti.
              </p>
              <ul
                className="mt-8 space-y-3"
                aria-label="Beneficios del servicio"
              >
                {[
                  "Atención personalizada desde el primer contacto",
                  "Horarios flexibles adaptados a tu agenda",
                  "Experiencia premium en cada visita",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-6 text-keysar-text"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-keysar-gold"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-keysar-gold/30 bg-keysar-linen px-7 py-8 shadow-sm sm:px-9 sm:py-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-keysar-gold">
                Tu cita
              </p>
              <h3 className="mt-1 text-lg font-semibold text-keysar-dark">
                Completa tus datos
              </h3>
              <form className="mt-6 space-y-4" onSubmit={submit}>
                {coupon && (
                  <div
                    className="flex items-start gap-3 border border-keysar-gold/35 bg-keysar-sand/60 px-4 py-3"
                    role="status"
                  >
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-keysar-gold text-white"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-keysar-dark">
                        Beneficio KEYSAR15 activado
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-keysar-gray">
                        15% de cortesía en un segundo tratamiento. Tu asesora te
                        ayudará a elegirlo.
                      </p>
                    </div>
                  </div>
                )}
                <label className="block">
                  <span className="sr-only">Nombre(s)</span>
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Nombre(s)"
                    required
                    className="w-full border border-keysar-text/30 bg-transparent px-4 py-3 text-sm text-keysar-text outline-none placeholder:text-keysar-gray focus:border-keysar-gold"
                  />
                </label>
                <label className="relative block">
                  <span className="sr-only">Servicio de interés</span>
                  <select
                    value={service}
                    onChange={(event) =>
                      setService(
                        event.target.value as keyof typeof services | "",
                      )
                    }
                    name="service"
                    required
                    className="w-full appearance-none border border-keysar-text/30 bg-transparent px-4 py-3 pr-12 text-sm text-keysar-text outline-none focus:border-keysar-gold"
                  >
                    <option value="">Servicio de interés</option>
                    {Object.entries(services).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  >
                    ⌄
                  </span>
                </label>
                <label className="relative block">
                  <span className="sr-only">Sucursal</span>
                  <select
                    value={branch}
                    onChange={(event) =>
                      setBranch(
                        event.target.value as keyof typeof branches | "",
                      )
                    }
                    name="branch"
                    required
                    className="w-full appearance-none border border-keysar-text/30 bg-transparent px-4 py-3 pr-12 text-sm text-keysar-text outline-none focus:border-keysar-gold"
                  >
                    <option value="">Sucursal</option>
                    {Object.entries(branches).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  >
                    ⌄
                  </span>
                </label>
                <label className="block">
                  <span className="sr-only">Teléfono</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Teléfono"
                    required
                    minLength={10}
                    pattern="[0-9 ()+-]{10,}"
                    title="Ingresa un teléfono de al menos 10 dígitos"
                    className="w-full border border-keysar-text/30 bg-transparent px-4 py-3 text-sm text-keysar-text outline-none placeholder:text-keysar-gray focus:border-keysar-gold"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-full bg-keysar-gold px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-keysar-dark focus:outline-none focus:ring-4 focus:ring-keysar-gold/30"
                >
                  Agendar cita
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-keysar-gold/45 bg-transparent px-6 py-3.5 text-sm font-semibold text-keysar-text transition hover:border-keysar-gold hover:bg-white/60 focus:outline-none focus:ring-4 focus:ring-keysar-gold/20"
                >
                  Continuar por WhatsApp
                </a>
              </form>
            </div>
          </div>
        </div>
      </section>

      {couponOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="experience-coupon-title"
          aria-describedby="experience-coupon-description"
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-keysar-dark/55 p-4 backdrop-blur-[2px]"
        >
          <button
            type="button"
            onClick={() => setCouponOpen(false)}
            className="absolute inset-0"
            aria-label="Cerrar promoción"
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden border border-white/40 bg-keysar-linen shadow-[0_24px_80px_rgba(36,31,26,0.28)]">
            <button
              type="button"
              onClick={() => setCouponOpen(false)}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-xl text-keysar-dark shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-keysar-gold/25"
              aria-label="Cerrar promoción"
            >
              ×
            </button>
            <div className="grid sm:grid-cols-[0.82fr_1.18fr]">
              <div className="relative hidden min-h-full sm:block">
                <Image
                  src="/images/keysar-cosmetics/real-cabina-doble.jpeg"
                  alt="Cabina de tratamiento doble en Keysar Cosmetics"
                  fill
                  sizes="(min-width: 640px) 270px, 0px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-keysar-dark/45 via-transparent to-white/10" />
              </div>
              <div className="relative px-6 py-9 sm:px-9 sm:py-11">
                <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-keysar-rose-100/65 blur-2xl" />
                <p className="relative text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-keysar-gold">
                  Beneficio exclusivo
                </p>
                <h2
                  id="experience-coupon-title"
                  className="relative mt-3 font-title text-3xl leading-tight text-keysar-dark sm:text-[2.15rem]"
                >
                  Completa tu experiencia
                </h2>
                <p
                  id="experience-coupon-description"
                  className="relative mt-4 text-sm leading-6 text-keysar-gray"
                >
                  Agrega un segundo tratamiento a tu visita y recibe{" "}
                  <strong className="font-semibold text-keysar-dark">
                    15% de cortesía
                  </strong>{" "}
                  en el de menor valor.
                </p>
                <div className="relative mt-6 flex items-center justify-between gap-3 border-y border-dashed border-keysar-gold/45 py-3">
                  <span className="text-xs uppercase tracking-[0.14em] text-keysar-gray">
                    Tu código
                  </span>
                  <strong className="font-title text-xl tracking-[0.12em] text-keysar-gold">
                    KEYSAR15
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={acceptCoupon}
                  className="relative mt-6 w-full rounded-full bg-keysar-gold px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-keysar-dark focus:outline-none focus:ring-4 focus:ring-keysar-gold/30"
                >
                  Quiero mi beneficio
                </button>
                <button
                  type="button"
                  onClick={() => setCouponOpen(false)}
                  className="relative mt-3 w-full px-4 py-2 text-xs font-medium text-keysar-gray underline decoration-keysar-gray/35 underline-offset-4 transition hover:text-keysar-dark"
                >
                  Continuar sin el beneficio
                </button>
                <p className="relative mt-4 text-center text-[0.68rem] leading-4 text-keysar-gray/85">
                  Sujeto a disponibilidad. No acumulable con otras promociones.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
