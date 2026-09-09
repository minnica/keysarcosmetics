"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button, Input, Label } from "@cosmetics/ui";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const bootstrap = await schedulerApi.login(email, password);
      const hasScreen = bootstrap.permissions.some((permission) =>
        permission.capabilities.includes("READ"),
      );
      if (!hasScreen) {
        schedulerApi.logout();
        setError("Tu puesto no tiene pantallas de Scheduler asignadas.");
        return;
      }
      const requestedPath = new URLSearchParams(window.location.search).get(
        "next",
      );
      const destination =
        requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
          ? requestedPath
          : "/";
      window.location.assign(destination);
    } catch (cause) {
      setError(schedulerApiErrorMessage(cause, "No se pudo iniciar sesión."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0b0a] text-[#f8f1e9]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(195,165,131,0.2),transparent_30%),linear-gradient(135deg,#171310_0%,#0d0b0a_55%,#080706_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/25 shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[38rem] overflow-hidden bg-[radial-gradient(circle_at_30%_28%,rgba(215,180,136,0.32),transparent_24%),radial-gradient(circle_at_68%_68%,rgba(196,143,132,0.2),transparent_30%),linear-gradient(145deg,#302821,#15110e_58%,#0b0908)] lg:flex lg:items-end">
            <div className="absolute -left-24 top-20 h-80 w-80 rounded-full border border-[#d7b488]/20" />
            <div className="absolute left-14 top-44 h-64 w-64 rounded-full border border-white/10" />
            <div className="relative p-12">
              <p className="max-w-md font-brand text-5xl uppercase leading-[1.12] tracking-[0.12em] text-white/90">
                Cada cita, cuidada desde el detalle.
              </p>
            </div>
          </section>
          <section className="flex items-center justify-center px-6 py-12 sm:px-12">
            <form
              className="w-full max-w-sm"
              data-e2e-ready={hydrated || undefined}
              onSubmit={submit}
            >
              <Image
                src="/logo.svg"
                alt="Keysar Cosmetics"
                width={100}
                height={76}
                className="h-12 w-auto"
                priority
              />
              <p className="mt-6 text-[0.68rem] uppercase tracking-[0.3em] text-[#d7b488]">
                Agenda interna
              </p>
              <h1 className="mt-3 font-brand text-4xl uppercase tracking-[0.14em]">
                Scheduler
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Accede con tu cuenta compartida de Keysar Cosmetics.
              </p>
              <div className="mt-9 space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs uppercase tracking-[0.18em] text-white/70"
                  >
                    Correo
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@keysar.com"
                    className="h-12 border-white/10 bg-white/[0.05] text-white placeholder:text-white/35"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs uppercase tracking-[0.18em] text-white/70"
                  >
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Tu contraseña"
                    className="h-12 border-white/10 bg-white/[0.05] text-white placeholder:text-white/35"
                  />
                </div>
                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-950/55 px-4 py-3 text-sm text-red-100"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={!hydrated || loading}
                  className="h-12 w-full rounded-full bg-[#d7b488] text-xs uppercase tracking-[0.2em] text-[#17120e] hover:bg-[#e3c59b]"
                >
                  {loading ? "Validando…" : "Entrar a Scheduler"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
