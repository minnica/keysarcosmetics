"use client";
import { useState, type FormEvent } from "react";
import { Button, Card, CardContent, Input, Label } from "@cosmetics/ui";
export default function PilotLogin() {
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/piloto/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: data.get("user"),
          password: data.get("password"),
        }),
      });
      if (res.ok) {
        window.location.replace("/");
        return;
      }
      setError(
        res.status === 401
          ? "Usuario o clave incorrectos."
          : res.status === 429
            ? "Demasiados intentos. Espera un minuto."
            : ((await res.json()).message ??
              "El piloto aún no está disponible."),
      );
    } catch {
      setError("No se pudo conectar con el piloto.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardContent className="grid gap-5 p-7">
          <h1 className="page-title">Piloto de nómina</h1>
          <p>
            Ingresa con tu cuenta de pruebas. Los cambios se guardan en la copia
            de nómina.
          </p>
          <form className="grid gap-4" onSubmit={submit}>
            <Label htmlFor="user">Usuario del piloto</Label>
            <Input id="user" name="user" autoComplete="username" required />
            <Label htmlFor="password">Clave del piloto</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {error && <p role="alert">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Ingresando…" : "Ingresar al piloto"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
