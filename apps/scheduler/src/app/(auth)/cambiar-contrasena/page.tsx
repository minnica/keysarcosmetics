"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Input, Label } from "@cosmetics/ui";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";

export default function PasswordResetPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("El enlace no contiene un token válido.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await schedulerApi.confirmManagedUserPasswordReset({
        token,
        password,
        passwordConfirmation: confirmation,
      });
      setChanged(true);
    } catch (cause) {
      setError(
        schedulerApiErrorMessage(cause, "No se pudo cambiar la contraseña."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0b0a] text-[#f8f1e9]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(195,165,131,0.2),transparent_30%),linear-gradient(135deg,#171310_0%,#0d0b0a_55%,#080706_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-black/30 p-7 shadow-2xl sm:p-10">
          <Image
            alt="Keysar Cosmetics"
            className="h-12 w-auto"
            height={76}
            priority
            src="/logo.svg"
            width={100}
          />
          {changed ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
              <h1 className="mt-5 font-brand text-3xl uppercase tracking-[0.1em]">
                Contraseña actualizada
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/65">
                El enlace quedó invalidado y ya puedes volver al inicio de
                sesión.
              </p>
              <Button
                asChild
                className="mt-7 rounded-full bg-[#d7b488] text-[#17120e] hover:bg-[#e3c59b]"
              >
                <Link href="/login">Ir a iniciar sesión</Link>
              </Button>
            </div>
          ) : (
            <form className="mt-7" onSubmit={submit}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d7b488]/15 text-[#d7b488]">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <p className="mt-6 text-[0.68rem] uppercase tracking-[0.3em] text-[#d7b488]">
                Seguridad de la cuenta
              </p>
              <h1 className="mt-3 font-brand text-4xl uppercase tracking-[0.1em]">
                Cambiar contraseña
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Usa al menos 10 caracteres, mayúscula, minúscula, número y
                símbolo. El enlace sólo puede utilizarse una vez.
              </p>
              <div className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label
                    className="text-xs uppercase tracking-[0.16em] text-white/70"
                    htmlFor="new-password"
                  >
                    Nueva contraseña
                  </Label>
                  <Input
                    autoComplete="new-password"
                    className="h-12 border-white/10 bg-white/[0.05] text-white placeholder:text-white/35"
                    id="new-password"
                    minLength={10}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-xs uppercase tracking-[0.16em] text-white/70"
                    htmlFor="password-confirmation"
                  >
                    Confirmar contraseña
                  </Label>
                  <Input
                    autoComplete="new-password"
                    className="h-12 border-white/10 bg-white/[0.05] text-white placeholder:text-white/35"
                    id="password-confirmation"
                    minLength={10}
                    onChange={(event) => setConfirmation(event.target.value)}
                    required
                    type="password"
                    value={confirmation}
                  />
                </div>
                {error ? (
                  <p
                    className="rounded-xl bg-red-950/55 px-4 py-3 text-sm text-red-100"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  className="h-12 w-full rounded-full bg-[#d7b488] text-xs uppercase tracking-[0.18em] text-[#17120e] hover:bg-[#e3c59b]"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Guardando…" : "Guardar nueva contraseña"}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
