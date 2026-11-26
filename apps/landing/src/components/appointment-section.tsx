"use client";

import { whatsappPhoneNumber } from "@/lib/contact";
import { treatmentGroups } from "@/data/treatments";
import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const branches = {
  "sucursal-1": "Sucursal Masaryk",
  "sucursal-2": "Keysar Cosmétics Mítikah Luxury",
  "sucursal-3": "Sucursal Parque Delta Beauty Córner",
  "sucursal-4": "Opatra Galería Insurgentes",
} as const;

const channelLabels = {
  whatsapp: "WhatsApp",
  telefono: "Llamada",
  email: "Email",
} as const;

const bookingSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe tu nombre completo.").max(120),
    phone: z.string().trim().max(30),
    email: z.union([
      z.string().trim().email("Ingresa un correo válido."),
      z.literal(""),
    ]),
    service: z.string().refine(
      (value) =>
        treatmentGroups.some((group) =>
          group.treatments.some((treatment) => treatment.title === value),
        ),
      "Selecciona un servicio.",
    ),
    branch: z.string().refine((value) => value in branches, "Selecciona una sucursal."),
    preferredDate: z
      .string()
      .min(1, "Elige una fecha.")
      .refine(
        (value) => !value || value >= localDate(),
        "Elige una fecha de hoy en adelante.",
      ),
    preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elige una hora."),
    channel: z.enum(["whatsapp", "telefono", "email"]),
    message: z.string().trim().max(600, "Máximo 600 caracteres."),
  })
  .superRefine((values, context) => {
    const digits = values.phone.replace(/\D/g, "");
    if (values.phone && (!/^[+()\d\s-]+$/.test(values.phone) || digits.length < 10)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Ingresa un teléfono de al menos 10 dígitos.",
      });
    }
    if (values.channel !== "email" && !values.phone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Agrega un teléfono para confirmar por WhatsApp o llamada.",
      });
    }
    if (values.channel === "email" && !values.email) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Agrega tu correo para recibir la confirmación.",
      });
    }
  });

type BookingValues = z.infer<typeof bookingSchema>;

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const inputClassName =
  "w-full min-w-0 border border-keysar-text/30 bg-transparent px-3 py-2.5 text-base text-keysar-text outline-none placeholder:text-keysar-gray focus:border-keysar-gold";

const selectClassName = `${inputClassName} min-w-0 appearance-none`;

export function AppointmentSection({
  service,
  onServiceChange,
}: {
  service: string;
  onServiceChange: (service: string) => void;
}) {
  const [coupon, setCoupon] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [today, setToday] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    clearErrors,
    setFocus,
    formState: { errors },
  } = useForm<BookingValues>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      service,
      branch: "",
      preferredDate: "",
      preferredTime: "",
      channel: "whatsapp",
      message: "",
    },
  });
  const channel = watch("channel");

  useEffect(() => setToday(localDate()), []);

  useEffect(() => {
    setValue("service", service);
  }, [service, setValue]);

  useEffect(() => {
    const subscription = watch((_values, { name }) => {
      if (name) clearErrors(name);
    });
    return () => subscription.unsubscribe();
  }, [clearErrors, watch]);

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

  const submit = (values: BookingValues) => {
    const result = bookingSchema.safeParse(values);
    if (!result.success) {
      const firstInvalidField = result.error.issues[0]?.path[0] as
        | keyof BookingValues
        | undefined;
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof BookingValues;
        setError(field, { type: "manual", message: issue.message });
      }
      if (firstInvalidField === "email" || firstInvalidField === "message") {
        setOptionalOpen(true);
      }
      if (firstInvalidField) {
        window.requestAnimationFrame(() => setFocus(firstInvalidField));
      }
      return;
    }

    const booking = result.data;
    const [year, month, day] = booking.preferredDate.split("-");
    const message = [
      "Hola, quiero solicitar una cita en Keysar Cosmetics.",
      `Nombre: ${booking.name}.`,
      booking.phone ? `Teléfono: ${booking.phone}.` : "",
      booking.email ? `Correo: ${booking.email}.` : "",
      `Servicio: ${booking.service}.`,
      `Sucursal: ${branches[booking.branch as keyof typeof branches]}.`,
      `Fecha preferida: ${day}/${month}/${year}.`,
      `Hora preferida: ${booking.preferredTime}.`,
      `Canal para confirmar: ${channelLabels[booking.channel]}.`,
      booking.message ? `Detalle adicional: ${booking.message}.` : "",
      coupon ? "Beneficio KEYSAR15 para un segundo tratamiento." : "",
      "La fecha y hora están sujetas a confirmación.",
    ]
      .filter(Boolean)
      .join("\n");
    const whatsappUrl = `https://wa.me/${whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const acceptCoupon = () => {
    setCoupon(true);
    setCouponOpen(false);
    window.requestAnimationFrame(() => setFocus("name"));
  };

  return (
    <>
      <section
        className="ks-section-d px-5 py-12 sm:px-6 sm:py-16 md:px-10 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14 xl:gap-24">
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

            <div
              id="agenda"
              className="scroll-mt-5 border border-keysar-gold/30 bg-keysar-linen px-5 py-6 shadow-sm sm:px-9 sm:py-10 lg:scroll-mt-24"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-keysar-gold">
                Tu cita
              </p>
              <h3 className="mt-1 text-lg font-semibold text-keysar-dark">
                Reserva tu cita
              </h3>
              <p className="mt-2 text-sm leading-6 text-keysar-gray">
                Comparte tus preferencias y te confirmaremos los detalles por el
                canal que elijas.
              </p>
              {!coupon && (
                <button
                  type="button"
                  onClick={() => setCouponOpen(true)}
                  className="mt-3 text-left text-sm font-semibold text-keysar-gold underline underline-offset-4 transition hover:text-keysar-dark focus:outline-none focus:ring-2 focus:ring-keysar-gold/40"
                >
                  Ver beneficio para un segundo tratamiento
                </button>
              )}
              <form
                className="mt-5 space-y-4"
                onSubmit={handleSubmit(submit)}
                noValidate
              >
                <input
                  type="hidden"
                  name="coupon"
                  value={coupon ? "KEYSAR15" : ""}
                />
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
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <BookingField label="Nombre completo" error={errors.name?.message}>
                    <input
                      {...register("name")}
                      autoComplete="name"
                      placeholder="Tu nombre"
                      aria-invalid={Boolean(errors.name)}
                      className={inputClassName}
                    />
                  </BookingField>
                  <BookingField label="Canal de contacto" error={errors.channel?.message}>
                    <select
                      {...register("channel")}
                      aria-invalid={Boolean(errors.channel)}
                      className={selectClassName}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telefono">Llamada</option>
                      <option value="email">Email</option>
                    </select>
                  </BookingField>
                  {channel === "email" ? (
                    <BookingField label="Correo electrónico" error={errors.email?.message}>
                      <input
                        {...register("email")}
                        type="email"
                        autoComplete="email"
                        placeholder="tu@email.com"
                        aria-invalid={Boolean(errors.email)}
                        className={inputClassName}
                      />
                    </BookingField>
                  ) : (
                    <BookingField label="Teléfono" error={errors.phone?.message}>
                      <input
                        {...register("phone")}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+52 55..."
                        aria-invalid={Boolean(errors.phone)}
                        className={inputClassName}
                      />
                    </BookingField>
                  )}
                  <BookingField label="Servicio de interés" error={errors.service?.message}>
                    <Controller
                      name="service"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          onChange={(event) => {
                            field.onChange(event);
                            onServiceChange(event.target.value);
                          }}
                          aria-invalid={Boolean(errors.service)}
                          className={selectClassName}
                        >
                          <option value="">Selecciona un servicio</option>
                          {treatmentGroups.map((group) => (
                            <optgroup key={group.key} label={group.label}>
                              {group.treatments.map((treatment) => (
                                <option key={treatment.title} value={treatment.title}>
                                  {treatment.title}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      )}
                    />
                  </BookingField>
                  <BookingField
                    label="Sucursal"
                    error={errors.branch?.message}
                    className="sm:col-span-2"
                  >
                    <select
                      {...register("branch")}
                      aria-invalid={Boolean(errors.branch)}
                      className={selectClassName}
                    >
                      <option value="">Selecciona una sucursal</option>
                      {Object.entries(branches).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </BookingField>
                  <div className="grid min-w-0 gap-3 min-[360px]:grid-cols-2 sm:col-span-2 sm:gap-4">
                    <BookingField label="Fecha preferida" error={errors.preferredDate?.message}>
                      <input
                        {...register("preferredDate")}
                        type="date"
                        min={today || undefined}
                        aria-invalid={Boolean(errors.preferredDate)}
                        className={inputClassName}
                      />
                    </BookingField>
                    <BookingField label="Hora preferida" error={errors.preferredTime?.message}>
                      <input
                        {...register("preferredTime")}
                        type="time"
                        aria-invalid={Boolean(errors.preferredTime)}
                        className={inputClassName}
                      />
                    </BookingField>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    aria-expanded={optionalOpen}
                    aria-controls="booking-optional-fields"
                    onClick={() => setOptionalOpen((open) => !open)}
                    className="flex min-h-11 w-full items-center justify-between border-y border-keysar-gold/30 py-2 text-left text-sm font-semibold text-keysar-text transition hover:text-keysar-dark focus:outline-none focus:ring-2 focus:ring-keysar-gold/40"
                  >
                    {channel === "email" ? "Agregar teléfono o detalles" : "Agregar correo o detalles"}
                    <span aria-hidden="true" className="text-lg leading-none text-keysar-gold">
                      {optionalOpen ? "−" : "+"}
                    </span>
                  </button>
                  <div
                    id="booking-optional-fields"
                    className={optionalOpen ? "grid gap-3 pt-4 sm:grid-cols-2 sm:gap-4" : "hidden"}
                  >
                    {channel === "email" ? (
                      <BookingField label="Teléfono (opcional)" error={errors.phone?.message}>
                        <input
                          {...register("phone")}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+52 55..."
                          aria-invalid={Boolean(errors.phone)}
                          className={inputClassName}
                        />
                      </BookingField>
                    ) : (
                      <BookingField label="Correo electrónico (opcional)" error={errors.email?.message}>
                        <input
                          {...register("email")}
                          type="email"
                          autoComplete="email"
                          placeholder="tu@email.com"
                          aria-invalid={Boolean(errors.email)}
                          className={inputClassName}
                        />
                      </BookingField>
                    )}
                    <BookingField label="Detalle extra (opcional)" error={errors.message?.message}>
                      <textarea
                        {...register("message")}
                        rows={2}
                        maxLength={600}
                        placeholder="Cuéntanos si hay algún detalle importante para tu visita..."
                        aria-invalid={Boolean(errors.message)}
                        className={`${inputClassName} resize-y`}
                      />
                    </BookingField>
                  </div>
                </div>
                <p className="text-xs leading-5 text-keysar-gray">
                  La fecha y hora son preferencias; una asesora confirmará la
                  disponibilidad por {channelLabels[channel]}.
                </p>
                <button
                  type="submit"
                  className="w-full rounded-full bg-keysar-gold px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-keysar-dark focus:outline-none focus:ring-4 focus:ring-keysar-gold/30"
                >
                  Enviar solicitud
                </button>
                <p className="text-center text-xs leading-5 text-keysar-gray">
                  Se abrirá WhatsApp con tu solicitud. Pulsa Enviar en el chat
                  para que llegue a Keysar.
                </p>
              </form>
              <p className="mt-5 text-center text-xs text-keysar-gray">
                ¿Prefieres llamarnos?{" "}
                <a
                  href={`tel:+${whatsappPhoneNumber}`}
                  className="font-semibold text-keysar-text underline underline-offset-2 hover:text-keysar-gold"
                >
                  +52 55 8056 1135
                </a>
              </p>
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

function BookingField({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-keysar-text">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-medium text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}
