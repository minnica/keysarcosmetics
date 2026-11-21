"use client";

import { testimonials } from "@/data/testimonials";
import Image from "next/image";
import { useEffect, useState } from "react";

export function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const rotation = window.setInterval(
      () => setActive((index) => (index + 1) % testimonials.length),
      5500,
    );
    return () => window.clearInterval(rotation);
  }, [paused]);

  const show = (index: number) =>
    setActive((index + testimonials.length) % testimonials.length);

  return (
    <section className="ks-section-a px-6 py-20 md:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="relative mx-auto max-w-5xl text-center">
          <h2 className="font-title text-3xl leading-tight text-keysar-dark sm:text-4xl md:text-5xl">
            Nuestros clientes aman Keysar
            <br className="hidden md:block" /> Cosmetics
          </h2>
          <button
            type="button"
            onClick={() => show(active - 1)}
            aria-label="Ver referencia anterior"
            className="absolute left-0 top-[58%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-keysar-dark/10 bg-white/85 text-keysar-dark shadow-sm transition hover:border-keysar-gold hover:text-keysar-gold md:inline-flex"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => show(active + 1)}
            aria-label="Ver siguiente referencia"
            className="absolute right-0 top-[58%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-keysar-dark/10 bg-white/85 text-keysar-dark shadow-sm transition hover:border-keysar-gold hover:text-keysar-gold md:inline-flex"
          >
            →
          </button>
          <div
            aria-live="polite"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="mx-auto mt-14 max-w-3xl"
          >
            {testimonials.map(
              (testimonial, index) =>
                index === active && (
                  <article key={testimonial.name}>
                    <blockquote>
                      <p className="font-title text-xl leading-relaxed text-keysar-dark sm:text-2xl md:text-3xl">
                        “{testimonial.quote}”
                      </p>
                    </blockquote>
                    <div className="mt-8 flex items-center justify-center gap-4">
                      {"imageSrc" in testimonial && testimonial.imageSrc ? (
                        <Image
                          src={testimonial.imageSrc}
                          alt={testimonial.name}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-semibold text-keysar-gold shadow-sm"
                          aria-hidden="true"
                        >
                          {testimonial.initials}
                        </span>
                      )}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-keysar-dark">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-keysar-gray">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </article>
                ),
            )}
          </div>
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => show(active - 1)}
              aria-label="Ver referencia anterior"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-keysar-dark/10 bg-white/85 text-keysar-dark shadow-sm md:hidden"
            >
              ←
            </button>
            <div className="flex items-center justify-center gap-2">
              {testimonials.map((testimonial, index) => (
                <button
                  key={testimonial.name}
                  type="button"
                  onClick={() => show(index)}
                  aria-label={`Ver referencia de ${testimonial.name}`}
                  aria-current={index === active}
                  className={`h-2 rounded-full transition-all ${index === active ? "w-6 bg-keysar-dark" : "w-2 bg-keysar-dark/25"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => show(active + 1)}
              aria-label="Ver siguiente referencia"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-keysar-dark/10 bg-white/85 text-keysar-dark shadow-sm md:hidden"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
