'use client'
// Pantalla de login — guarda el JWT en localStorage para que el interceptor de axios lo use
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Button } from '@cosmetics/ui'
import { Input } from '@cosmetics/ui'
import { Label } from '@cosmetics/ui'
import type { ScreenKey } from '@cosmetics/types'
import { useI18n } from '@/lib/i18n'
import { getFirstAccessiblePath } from '@/lib/access'

function createSchema(messages: { invalidEmail: string; passwordRequired: string }) {
  return z.object({
    email: z.string().email(messages.invalidEmail),
    password: z.string().min(1, messages.passwordRequired),
  })
}
type LoginForm = z.infer<ReturnType<typeof createSchema>>

export default function LoginPage() {
  const { t } = useI18n()
  const [serverError, setServerError] = useState<string | null>(null)
  const schema = useMemo(
    () => createSchema({
      invalidEmail: t.login.invalidEmail,
      passwordRequired: t.login.passwordRequired,
    }),
    [t],
  )

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: LoginForm) {
    setServerError(null)
    try {
      const res = await api.post<{
        success: boolean
        data: {
          token: string
          usuario?: {
            canManageAccess: boolean
            screenPermissions: string[]
          }
        }
      }>(
        '/api/auth/login',
        { email: data.email, password: data.password }
      )
      // Guardar el token con la misma clave que lee el interceptor de @cosmetics/api-client
      localStorage.setItem('auth_token', res.data.data.token)
      const usuario = res.data.data.usuario
      const destination =
        usuario?.canManageAccess
          ? '/accesos'
          : getFirstAccessiblePath((usuario?.screenPermissions ?? []) as ScreenKey[], false) ?? '/'
      window.location.assign(destination)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t.login.submitError
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
            <h1 className="font-brand text-2xl tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {t.login.title}
            </h1>
            <p className="text-xs mt-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {t.login.subtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.login.email}</Label>
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
            <Label htmlFor="password">{t.login.password}</Label>
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
            {isSubmitting ? t.login.entering : t.login.enter}
          </Button>
        </form>
      </div>
    </div>
  )
}
