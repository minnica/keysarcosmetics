'use client'
// Pantalla de login — guarda el JWT en localStorage para que el interceptor de axios lo use
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Button } from '@cosmetics/ui'
import { Input } from '@cosmetics/ui'
import { Label } from '@cosmetics/ui'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})
type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: LoginForm) {
    setServerError(null)
    try {
      const res = await api.post<{ success: boolean; data: { token: string } }>(
        '/api/auth/login',
        { email: data.email, password: data.password }
      )
      // Guardar el token con la misma clave que lee el interceptor de @cosmetics/api-client
      localStorage.setItem('auth_token', res.data.data.token)
      router.push('/')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al iniciar sesión'
      setServerError(msg)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-sm space-y-8 rounded-[14px] border p-8"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          boxShadow: '0 4px 24px rgba(195, 165, 131, 0.15)',
        }}
      >
        {/* Logo y encabezado */}
        <div className="space-y-4 text-center">
          <img
            src="/logo.svg"
            alt="Keysar Cosmetics"
            className="mx-auto"
            style={{ maxWidth: '120px', height: 'auto' }}
          />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Iniciar sesión
            </h1>
            <p className="text-xs mt-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Control de ventas — Keysarcosmetics
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@cosmetics.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p
              className="text-sm rounded-[8px] px-3 py-2 border"
              style={{
                color: '#c0392b',
                backgroundColor: '#fdf0ef',
                borderColor: '#f5c0bb',
              }}
            >
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
