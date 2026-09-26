"use client";

import { videos } from "@/data/videos";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function VideoReelsSection() {
  const [cardIndex, setCardIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [activeVideo, setActiveVideo] = useState<
    (typeof videos)[number] | null
  >(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  const getStep = () => {
    const carousel = carouselRef.current;
    const card = carousel?.querySelector<HTMLElement>("[data-reel-card]");
    if (!carousel || !card) return 0;
    return (
      card.getBoundingClientRect().width +
      Number.parseFloat(getComputedStyle(carousel).columnGap || "0")
    );
  };

  const updateIndex = () => {
    const carousel = carouselRef.current;
    const step = getStep();
    if (!carousel || step <= 0) return;
    setCardIndex(
      Math.max(
        0,
        Math.min(videos.length - 1, Math.round(carousel.scrollLeft / step)),
      ),
    );
    setAtEnd(
      carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 2,
    );
  };

  useEffect(() => {
    if (!activeVideo) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    playerRef.current?.play().catch(() => undefined);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveVideo(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      activeTriggerRef.current?.focus();
    };
  }, [activeVideo]);

  return (
    <section className="ks-section-c px-5 py-16 sm:px-6 md:px-10 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-title text-3xl leading-tight tracking-[-0.03em] text-keysar-text sm:text-4xl md:text-5xl">
            Momentos que transforman
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-keysar-text">
            Descubre la experiencia Keysar a través de cada ritual, técnica y
            momento de bienestar real.
          </p>
        </div>
        <div className="mt-10 lg:mt-12">
          <div className="flex items-center justify-end gap-2">
            <ReelArrow
              label="Ver video anterior"
              disabled={cardIndex === 0}
              onClick={() =>
                carouselRef.current?.scrollBy({
                  left: -getStep(),
                  behavior: "smooth",
                })
              }
            >
              ←
            </ReelArrow>
            <ReelArrow
              label="Ver siguiente video"
              disabled={atEnd}
              onClick={() =>
                carouselRef.current?.scrollBy({
                  left: getStep(),
                  behavior: "smooth",
                })
              }
            >
              →
            </ReelArrow>
          </div>
          <div
            ref={carouselRef}
            onScroll={updateIndex}
            role="region"
            aria-label="Galería de videos Keysar"
            tabIndex={0}
            className="mt-4 grid auto-cols-[calc((100%-0.375rem)/1.5)] grid-flow-col snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] sm:auto-cols-[calc((100%-2rem)/3)] sm:gap-4 lg:auto-cols-[calc((100%-4rem)/5)] [&::-webkit-scrollbar]:hidden"
          >
            {videos.map((video) => (
              <button
                key={video.id}
                data-reel-card
                type="button"
                onClick={(event) => {
                  activeTriggerRef.current = event.currentTarget;
                  setActiveVideo(video);
                }}
                aria-label={`Reproducir video ${video.id} de ${videos.length}`}
                className="group relative snap-start overflow-hidden rounded-[4px] bg-keysar-rose-100 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-keysar-gold focus:ring-offset-2"
              >
                <div className="relative aspect-[9/16] overflow-hidden">
                  <Image
                    src={video.poster}
                    alt={`Experiencia Keysar Cosmetics — momento ${video.id}`}
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 67vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition duration-300 group-hover:bg-black/30 group-focus-visible:bg-black/30">
                  <span
                    className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/80 text-xl text-keysar-dark shadow-md backdrop-blur-sm transition group-hover:scale-100"
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div
            className="mt-3 flex items-center justify-center gap-2"
            aria-hidden="true"
          >
            {videos.map((video, index) => (
              <span
                key={video.id}
                className={`h-1.5 rounded-full transition-all ${index === cardIndex ? "w-5 bg-keysar-gold" : "w-1.5 bg-keysar-gold/30"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reproductor de video Keysar"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setActiveVideo(null)}
            className="absolute inset-0"
            aria-label="Cerrar video"
          />
          <div className="relative z-10 w-full max-w-[300px] sm:max-w-[340px]">
            <button
              ref={closeRef}
              type="button"
              onClick={() => setActiveVideo(null)}
              aria-label="Cerrar video"
              className="absolute -right-1 -top-12 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              ×
            </button>
            <video
              ref={playerRef}
              key={activeVideo.id}
              className="aspect-[9/16] w-full rounded-lg shadow-2xl"
              poster={activeVideo.poster}
              playsInline
              controls
              preload="none"
            >
              <source src={activeVideo.webm} type="video/webm" />
              <source src={activeVideo.mp4} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </section>
  );
}

function ReelArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-keysar-gold/40 bg-white text-keysar-text shadow-sm transition hover:border-keysar-gold hover:text-keysar-gold disabled:cursor-not-allowed disabled:opacity-35"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
