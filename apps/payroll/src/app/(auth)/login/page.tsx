"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button, Input, Label } from "@cosmetics/ui";
import { api, apiErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<{
        success: boolean;
        data: {
          token: string;
          usuario: {
            canManagePayrollAccess: boolean;
            payrollScreenPermissions: string[];
          };
        };
      }>("/api/auth/login", { email, password });
      const { usuario } = response.data.data;
      if (
        !usuario.canManagePayrollAccess &&
        usuario.payrollScreenPermissions.length === 0
      ) {
        setError("Tu puesto no tiene acceso a Payroll.");
        return;
      }
      localStorage.setItem("auth_token", response.data.data.token);
      window.location.assign("/");
    } catch (cause) {
      setError(apiErrorMessage(cause, "No se pudo iniciar sesión."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090807] text-[#f6efe6]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(202,138,4,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(188,148,110,0.14),_transparent_26%),linear-gradient(180deg,_#0f0e0d_0%,_#090807_52%,_#050403_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-2xl bg-black/20 shadow-[0_4px_8px_rgba(0,0,0,0.42)] lg:grid-cols-[1.02fr_0.98fr]">
          <section className="relative min-h-[14rem] border-b border-[#120f0b] sm:min-h-[20rem] lg:min-h-[38rem] lg:border-b-0 lg:border-r">
            <Image
              src="/login-bg.webp"
              alt="Retrato editorial de belleza con acabado luminoso"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center opacity-72 saturate-[0.72] contrast-110"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,8,7,0.08)_0%,rgba(9,8,7,0.34)_48%,rgba(9,8,7,0.92)_100%)]" />
          </section>
          <section className="relative flex items-center justify-center px-5 py-6 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <form
              method="post"
              data-e2e-ready={isHydrated ? "true" : undefined}
              onSubmit={submit}
              className="w-full max-w-[24rem]"
            >
              <Image
                src="/logo.svg"
                alt="Keysar Cosmetics"
                width={92}
                height={70}
                className="h-10 w-auto opacity-95 sm:h-12"
                priority
              />
              <p className="mt-3 text-[0.66rem] uppercase tracking-[0.32em] text-[#d7b488] sm:mt-5">
                sofisticada, minimalista y consciente
              </p>
              <h1 className="mt-3 font-brand text-4xl uppercase tracking-[0.16em] text-[#f7f0e7] sm:mt-4 sm:text-[2.7rem]">
                Nómina
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70 sm:mt-4">
                Acceso administrativo a corridas, movimientos y recibos.
              </p>
              <div className="mt-6 space-y-4 sm:mt-10 sm:space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-[0.68rem] uppercase tracking-[0.2em] text-white/70"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="h-12 normal-case border-white/10 bg-white/[0.04] text-white placeholder:text-white/55 focus-visible:ring-[#d7b488]/40"
                    placeholder="correo@keysar.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-[0.68rem] uppercase tracking-[0.2em] text-white/70"
                  >
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    type="password"
                    className="h-12 normal-case border-white/10 bg-white/[0.04] text-white placeholder:text-white/55 focus-visible:ring-[#d7b488]/40"
                    placeholder="Tu contraseña"
                  />
                </div>
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-100"
                  >
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={loading || !isHydrated}
                  className="h-12 w-full rounded-full bg-[#d7b488] text-[0.72rem] uppercase tracking-[0.22em] text-[#110f0d] hover:bg-[#e4c79d]"
                >
                  {loading ? "Validando…" : "Entrar a nómina"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
