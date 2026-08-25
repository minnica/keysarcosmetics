"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label } from "@cosmetics/ui";

export default function LoginPage() {
  const [user, setUser] = useState("ADMINISTRADOR DEMO");
  const [password, setPassword] = useState("DEMO2026");
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[color:var(--bg-primary)] p-5"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(195,165,131,.28),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(100,134,114,.2),transparent_38%)]" /><Card className="relative w-full max-w-md border-[color:var(--border-color)] shadow-2xl"><CardContent className="p-7 sm:p-9"><div className="text-center"><img src="/logo.svg" alt="Keysar Cosmetics" className="mx-auto h-16 w-16" /><p className="mt-4 font-brand text-2xl uppercase tracking-[0.12em]">Keysar Cosmetics</p><div className="mt-3 flex justify-center"><Badge variant="outline">NÓMINA · DEMO FRONTEND</Badge></div><p className="mt-4 text-sm text-[color:var(--text-muted)]">Acceso de demostración. No valida usuarios reales ni se conecta a una base de datos.</p></div><div className="mt-7 space-y-4"><div className="space-y-2"><Label htmlFor="demo-user">Usuario</Label><Input id="demo-user" value={user} onChange={(event) => setUser(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="demo-password">Contraseña</Label><Input id="demo-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></div><Button asChild className="w-full" disabled={!user || !password}><Link href="/"><LockKeyhole className="mr-2 h-4 w-4" />Entrar al demo<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div><p className="mt-6 text-center text-xs text-[color:var(--text-muted)]">Los cambios se guardan únicamente en este navegador.</p></CardContent></Card></main>;
}
