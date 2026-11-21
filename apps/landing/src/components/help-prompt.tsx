"use client";

import { defaultWhatsAppUrl, whatsappPhoneNumber } from "@/lib/contact";
import { useEffect, useRef, useState } from "react";

const inactivityDelay = 6 * 60 * 1000;
const visitDelay = 8 * 60 * 1000;
const shownKey = "keysar-help-prompt-shown";

export function HelpPrompt() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem(shownKey)) return;

    let lastActivity = Date.now();
    let visibleSince: number | null = document.hidden ? null : Date.now();
    let visibleDuration = 0;
    let lastPointerMove = 0;

    const recordActivity = () => {
      lastActivity = Date.now();
    };
    const recordPointerMove = () => {
      const now = Date.now();
      if (now - lastPointerMove < 5000) return;
      lastPointerMove = now;
      lastActivity = now;
    };
    const onVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        if (visibleSince !== null) visibleDuration += now - visibleSince;
        visibleSince = null;
      } else {
        visibleSince = now;
        lastActivity = now;
      }
    };
    const checkPrompt = () => {
      if (document.hidden) return;
      const now = Date.now();
      const timeOnPage = visibleDuration + (visibleSince === null ? 0 : now - visibleSince);
      if (now - lastActivity < inactivityDelay && timeOnPage < visitDelay) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (
        document.activeElement?.closest("#agenda form") &&
        now - lastActivity < inactivityDelay
      ) return;

      window.sessionStorage.setItem(shownKey, "1");
      previousFocusRef.current = document.activeElement as HTMLElement;
      setOpen(true);
      window.clearInterval(interval);
    };

    window.addEventListener("pointerdown", recordActivity);
    window.addEventListener("pointermove", recordPointerMove);
    window.addEventListener("keydown", recordActivity);
    window.addEventListener("scroll", recordActivity, { passive: true });
    window.addEventListener("touchstart", recordActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(checkPrompt, 5000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", recordActivity);
      window.removeEventListener("pointermove", recordPointerMove);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("scroll", recordActivity);
      window.removeEventListener("touchstart", recordActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = closeButtonRef.current?.closest('[role="dialog"]');
      const focusable = Array.from(
        dialog?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keysar-help-title"
      aria-describedby="keysar-help-description"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-keysar-dark/55 px-4 py-6 backdrop-blur-[2px]"
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute inset-0"
        aria-label="Cerrar ayuda"
        tabIndex={-1}
      />
      <div className="relative my-auto w-full max-w-md border border-keysar-gold/35 bg-keysar-linen px-6 py-8 shadow-[0_24px_80px_rgba(36,31,26,0.28)] sm:px-9 sm:py-10">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-keysar-gold/35 text-xl text-keysar-dark transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-keysar-gold/25"
          aria-label="Cerrar ayuda"
        >
          ×
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-keysar-gold">
          Estamos para ti
        </p>
        <h2 id="keysar-help-title" className="mt-3 font-title text-3xl text-keysar-dark">
          ¿Necesitas ayuda?
        </h2>
        <p id="keysar-help-description" className="mt-3 text-sm leading-6 text-keysar-text">
          Podemos ayudarte a elegir tu tratamiento o resolver tus dudas. Elige
          cómo prefieres contactarnos.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href={defaultWhatsAppUrl}
            onClick={() => setOpen(false)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-keysar-gold/50 bg-white px-4 py-3 text-center text-sm font-semibold text-keysar-dark transition hover:border-keysar-gold hover:bg-keysar-sand/50"
          >
            WhatsApp
          </a>
          <a
            href={`tel:+${whatsappPhoneNumber}`}
            onClick={() => setOpen(false)}
            className="rounded-full border border-keysar-gold/50 bg-white px-4 py-3 text-center text-sm font-semibold text-keysar-dark transition hover:border-keysar-gold hover:bg-keysar-sand/50"
          >
            Llamar
          </a>
        </div>
        <div className="mt-7 border-t border-keysar-gold/25 pt-6">
          <a
            href="#agenda"
            onClick={() => {
              previousFocusRef.current = null;
              setOpen(false);
            }}
            className="flex w-full items-center justify-center rounded-full bg-keysar-gold px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-keysar-dark focus:outline-none focus:ring-4 focus:ring-keysar-gold/30"
          >
            Agendar una cita
          </a>
        </div>
      </div>
    </div>
  );
}
