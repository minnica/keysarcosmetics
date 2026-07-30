'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button, Input, Label } from '@cosmetics/ui'

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090807] text-[#f6efe6]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(202,138,4,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(188,148,110,0.14),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.05),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(202,138,4,0.12),_transparent_24%),linear-gradient(180deg,_#0f0e0d_0%,_#090807_52%,_#050403_100%)]" />
      <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(255,255,255,0.04),transparent_0_20%),radial-gradient(circle_at_92%_18%,rgba(215,180,136,0.08),transparent_0_18%),radial-gradient(circle_at_12%_88%,rgba(202,138,4,0.08),transparent_0_20%),radial-gradient(circle_at_88%_84%,rgba(255,255,255,0.03),transparent_0_18%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#120f0b] bg-black/20 shadow-[0_0_0_1px_rgba(215,180,136,0.16),0_30px_90px_rgba(215,180,136,0.18),0_54px_150px_rgba(0,0,0,0.72)] backdrop-blur-2xl lg:grid-cols-[1.02fr_0.98fr]">
          <section className="relative min-h-[20rem] border-b border-[#120f0b] lg:min-h-[38rem] lg:border-b-0 lg:border-r lg:border-[#120f0b]">
            <Image
              src="/login-bg.webp"
              alt="Retrato editorial de belleza con acabado luminoso"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center opacity-72 saturate-[0.72] contrast-110"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,8,7,0.08)_0%,rgba(9,8,7,0.34)_48%,rgba(9,8,7,0.92)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(202,138,4,0.16)_0%,rgba(202,138,4,0.04)_18%,rgba(255,255,255,0)_56%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(320deg,rgba(188,148,110,0.08)_0%,rgba(188,148,110,0.02)_20%,rgba(255,255,255,0)_58%)]" />
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:38px_38px]" />
          </section>

          <section className="relative flex items-center justify-center px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="w-full max-w-[24rem]">
              <Image src="/logo.svg" alt="Keysar Cosmetics" width={92} height={70} className="h-12 w-auto opacity-95" priority />
              <p className="mt-5 text-[0.66rem] uppercase tracking-[0.42em] text-[#d7b488]">sofisticada, minimalista y consciente</p>
              <h1 className="mt-4 font-serif text-4xl uppercase tracking-[0.22em] text-[#f7f0e7] sm:text-[2.7rem]">Nómina</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/58">Acceso interno a la administración de nómina.</p>

              <div className="mt-10 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[0.68rem] uppercase tracking-[0.34em] text-white/55">Email</Label>
                  <Input id="email" value="admin@keysar.demo" readOnly className="h-12 normal-case border-white/10 bg-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:ring-[#d7b488]/40" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[0.68rem] uppercase tracking-[0.34em] text-white/55">Contraseña</Label>
                  <Input id="password" value="Demo1234" readOnly type="password" className="h-12 normal-case border-white/10 bg-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:ring-[#d7b488]/40" />
                </div>
                <Button asChild className="h-12 w-full rounded-full border border-[#d7b488]/35 bg-[#d7b488] text-[0.72rem] uppercase tracking-[0.3em] text-[#110f0d] shadow-[0_18px_36px_rgba(215,180,136,0.2)] transition-transform duration-300 hover:translate-y-[-1px] hover:bg-[#e4c79d]">
                  <Link href="/">Entrar a demo</Link>
                </Button>
              </div>
              <p className="mt-6 text-[0.7rem] uppercase tracking-[0.28em] text-white/30">calidad · autenticidad · sofisticación</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
