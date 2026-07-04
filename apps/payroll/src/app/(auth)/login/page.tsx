'use client'

import Link from 'next/link'
import { Button, Card, CardContent, Input, Label } from '@cosmetics/ui'

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="payroll-glass w-full max-w-md rounded-[2rem] border-0">
        <CardContent className="p-6">
          <div className="mb-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[color:var(--border-color)] bg-[#080706] font-serif text-2xl text-[#d9d3ca] shadow-[0_14px_30px_rgba(0,0,0,0.34)]">K</div>
            <p className="label-caps mt-5">PAYROLL DEMO</p>
            <h1 className="mt-2 font-serif text-4xl tracking-[-0.06em]">Acceso interno</h1>
            <p className="mt-3 text-sm text-[color:var(--text-muted)]">Pantalla mock para presentacion. No autentica contra backend.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value="admin@keysar.demo" readOnly />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input value="Demo1234" readOnly type="password" />
            </div>
            <Button asChild className="w-full cursor-pointer rounded-full bg-[#d7b488] text-[#050404] hover:bg-[#e7c89a]">
              <Link href="/">Entrar a demo</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
