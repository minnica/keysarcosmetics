"use client";

import { treatmentGroups } from "@/data/treatments";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function TreatmentsSection() {
  const [groupIndex, setGroupIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const group = treatmentGroups[groupIndex] ?? treatmentGroups[0]!;

  useEffect(() => {
    setCardIndex(0);
    setAtEnd(false);
    carouselRef.current?.scrollTo({ left: 0 });
  }, [groupIndex]);

  useEffect(() => {
    if (detailIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailIndex(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [detailIndex]);

  const getStep = () => {
    const carousel = carouselRef.current;
    const card = carousel?.querySelector<HTMLElement>("[data-treatment-card]");
    if (!carousel || !card) return 0;
    const gap = Number.parseFloat(getComputedStyle(carousel).columnGap || "0");
    return card.getBoundingClientRect().width + gap;
  };

  const scroll = (direction: -1 | 1) => {
    carouselRef.current?.scrollBy({
      left: direction * getStep(),
      behavior: "smooth",
    });
  };

  const updateCardIndex = () => {
    const carousel = carouselRef.current;
    const step = getStep();
    if (!carousel || step <= 0) return;
    setCardIndex(
      Math.max(
        0,
        Math.min(
          group.treatments.length - 1,
          Math.round(carousel.scrollLeft / step),
        ),
      ),
    );
    setAtEnd(
      carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 2,
    );
  };

  const treatment = detailIndex === null ? null : group.treatments[detailIndex];

  return (
    <section
      id="servicios"
      className="bg-keysar-linen px-5 py-20 sm:px-6 md:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-keysar-gold">
            Tratamientos Keysar
          </p>
          <h2 className="mt-3 font-title text-3xl leading-tight text-keysar-text sm:text-4xl md:text-5xl">
            Rituales creados para ti
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-keysar-gray">
            Elige entre faciales y masajes diseñados para acompañar lo que tu
            piel y tu cuerpo necesitan hoy.
          </p>
          <div
            className="mt-7 inline-flex rounded-full border border-keysar-gold/25 bg-white p-1 shadow-sm"
            role="group"
            aria-label="Tipo de tratamiento"
          >
            {treatmentGroups.map((item, index) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={index === groupIndex}
                onClick={() => setGroupIndex(index)}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition sm:text-sm ${index === groupIndex ? "bg-keysar-gold text-white" : "text-keysar-text hover:text-keysar-gold"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 lg:mt-12">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-keysar-gray">
              {group.treatments.length} rituales disponibles
            </p>
            <div className="flex items-center gap-2">
              <CarouselButton
                direction="previous"
                label={`Ver tratamiento anterior de ${group.label.toLowerCase()}`}
                onClick={() => scroll(-1)}
                disabled={cardIndex === 0}
              />
              <CarouselButton
                direction="next"
                label={`Ver siguiente tratamiento de ${group.label.toLowerCase()}`}
                onClick={() => scroll(1)}
                disabled={atEnd}
              />
            </div>
          </div>

          <div
            ref={carouselRef}
            onScroll={updateCardIndex}
            role="region"
            aria-label={`Carrusel de ${group.ariaLabel}`}
            tabIndex={0}
            className="mt-4 grid auto-cols-[88%] grid-flow-col snap-x snap-mandatory items-stretch gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] sm:auto-cols-[calc((100%_-_1.5rem)/2)] sm:gap-6 lg:auto-cols-[calc((100%_-_3rem)/3)] [&::-webkit-scrollbar]:hidden"
          >
            {group.treatments.map((item, index) => (
              <article
                key={item.title}
                data-treatment-card
                className="group flex snap-start flex-col overflow-hidden rounded-[8px] border border-keysar-gold/15 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-keysar-gold/45 hover:shadow-lg"
              >
                <div className="relative aspect-[1.42/1] overflow-hidden bg-keysar-sand">
                  <Image
                    src={item.imageSrc ?? group.imageSrc}
                    alt={`${group.imageAltPrefix} ${item.title}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 88vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-keysar-text shadow-sm">
                    {item.tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-title text-xl leading-tight text-keysar-text">
                      {item.title}
                    </h3>
                    <span className="shrink-0 rounded-full border border-keysar-gold/25 px-3 py-1 text-xs font-medium text-keysar-gold">
                      {item.duration}
                    </span>
                  </div>
                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-keysar-gray">
                    {item.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.benefits.slice(0, 2).map((benefit) => (
                      <span
                        key={benefit}
                        className="rounded-full bg-keysar-sand px-3 py-1 text-xs font-medium text-keysar-text"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                  <button
                    ref={index === detailIndex ? returnFocusRef : undefined}
                    type="button"
                    aria-haspopup="dialog"
                    onClick={(event) => {
                      returnFocusRef.current = event.currentTarget;
                      setDetailIndex(index);
                    }}
                    className="mt-auto inline-flex items-center justify-between gap-3 pt-6 text-left text-sm font-semibold text-keysar-gold transition hover:text-keysar-text"
                  >
                    <span>Descubrir tratamiento</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div
            className="mt-2 flex items-center justify-center gap-2"
            aria-hidden="true"
          >
            {group.treatments.map((item, index) => (
              <span
                key={item.title}
                className={`h-2 rounded-full transition-all ${index === cardIndex ? "w-6 bg-keysar-gold" : "w-2 bg-keysar-gold/30"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {treatment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="treatment-detail-title"
          className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 sm:px-6"
        >
          <button
            type="button"
            onClick={() => setDetailIndex(null)}
            className="absolute inset-0 bg-keysar-dark/55 backdrop-blur-sm"
            aria-label="Cerrar detalle del tratamiento"
          />
          <div className="relative z-10 max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-y-auto rounded-[8px] bg-keysar-linen shadow-2xl">
            <button
              ref={closeRef}
              type="button"
              onClick={() => setDetailIndex(null)}
              className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-keysar-text shadow-sm transition hover:text-keysar-gold focus:outline-none focus:ring-4 focus:ring-keysar-gold/25"
              aria-label="Cerrar detalle del tratamiento"
            >
              ×
            </button>
            <article className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="relative min-h-[300px] overflow-hidden sm:min-h-[380px] lg:min-h-[620px]">
                <Image
                  src={treatment.imageSrc ?? group.imageSrc}
                  alt={`${group.imageAltPrefix} ${treatment.title} en detalle`}
                  fill
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                <div className="absolute bottom-7 left-6 right-14 text-white sm:left-8 sm:right-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                    {treatment.tag}
                  </p>
                  <h3
                    id="treatment-detail-title"
                    className="mt-3 font-title text-3xl leading-tight sm:text-4xl"
                  >
                    {treatment.title}
                  </h3>
                </div>
              </div>
              <div className="bg-keysar-sand p-6 sm:p-8 lg:p-10">
                <div className="flex flex-wrap gap-3 pr-12 sm:pr-0">
                  <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-keysar-text shadow-sm">
                    Duración: {treatment.duration}
                  </span>
                  <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-keysar-text shadow-sm">
                    {group.label}
                  </span>
                </div>
                <p className="mt-6 text-base leading-7 text-keysar-text lg:text-[17px] lg:leading-8">
                  {treatment.ritual}
                </p>
                <div className="mt-8 grid gap-7 md:grid-cols-[1fr_1.1fr]">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-keysar-gold">
                      Ideal para
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-keysar-gray">
                      {treatment.bestFor}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-keysar-gold">
                      Beneficios
                    </h4>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-keysar-text">
                      {treatment.benefits.map((benefit) => (
                        <li key={benefit} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-keysar-gold" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#agenda"
                    onClick={() => setDetailIndex(null)}
                    className="inline-flex items-center justify-center rounded-full bg-keysar-gold px-6 py-3 text-sm font-semibold text-white transition hover:bg-keysar-dark"
                  >
                    Agendar este ritual
                  </a>
                  <a
                    href="#agenda"
                    onClick={() => setDetailIndex(null)}
                    className="inline-flex items-center justify-center rounded-full border border-keysar-gold/45 px-6 py-3 text-sm font-semibold text-keysar-text transition hover:bg-white/60"
                  >
                    Pedir valoración
                  </a>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

function CarouselButton({
  direction,
  label,
  onClick,
  disabled,
}: {
  direction: "previous" | "next";
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-keysar-gold/40 bg-white text-keysar-text shadow-sm transition hover:border-keysar-gold hover:text-keysar-gold disabled:cursor-not-allowed disabled:opacity-35"
    >
      <span aria-hidden="true">{direction === "previous" ? "←" : "→"}</span>
    </button>
  );
}
