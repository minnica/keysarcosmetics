'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Lock, Pencil, Save, Shield, UserPlus } from 'lucide-react'
import type { ColumnDef } from '@cosmetics/ui'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  DataTable,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@cosmetics/ui'
import { useAccessAdmin } from '@/hooks'
import { SCREEN_CONFIG } from '@/lib/access'
import { useI18n } from '@/lib/i18n'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type CredentialsForm = z.infer<typeof credentialsSchema>

export default function AccessControlPage() {
  const { t, dataTableLabels } = useI18n()
  const { screens, positions, employees, users, loading, error, savePositionPermissions, saveCredentials } = useAccessAdmin()
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [draftCanManageAccess, setDraftCanManageAccess] = useState(false)
  const [draftPermissions, setDraftPermissions] = useState<Record<string, boolean>>({})
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [savingCredentials, setSavingCredentials] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  })

  const selectedPosition = useMemo(
    () => positions.find((position) => position.id === selectedPositionId) ?? null,
    [positions, selectedPositionId],
  )

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )

  const selectedUser = useMemo(
    () => users.find((user) => user.empleadoId === selectedEmployeeId) ?? null,
    [selectedEmployeeId, users],
  )

  useEffect(() => {
    if (!selectedPositionId && positions[0]) {
      setSelectedPositionId(positions[0].id)
      return
    }

    if (!selectedPosition) {
      return
    }

    setDraftCanManageAccess(selectedPosition.canManageAccess)
    setDraftPermissions(
      Object.fromEntries(
        SCREEN_CONFIG.map((screen) => [
          screen.key,
          selectedPosition.canManageAccess || selectedPosition.screenPermissions.some((permission) => permission.screenKey === screen.key && permission.allowed),
        ]),
      ) as Record<string, boolean>,
    )
  }, [positions, selectedPosition, selectedPositionId])

  useEffect(() => {
    if (!selectedEmployeeId) {
      reset({ email: '', password: '' })
      return
    }

    if (selectedUser) {
      setValue('email', selectedUser.email)
      return
    }

    setValue('email', '')
  }, [reset, selectedEmployeeId, selectedUser, setValue])

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: employee.nombreCompleto,
      })),
    [employees],
  )

  async function handleSavePermissions() {
    if (!selectedPosition) return
    setSavingPermissions(true)
    try {
      await savePositionPermissions(selectedPosition.id, {
        canManageAccess: draftCanManageAccess,
        permissions: SCREEN_CONFIG.map((screen) => ({
          screenKey: screen.key,
          allowed: draftCanManageAccess ? true : Boolean(draftPermissions[screen.key]),
        })),
      })
      toast.success(t.access.permissionsSaved)
    } catch {
      toast.error('No se pudieron guardar los permisos')
    } finally {
      setSavingPermissions(false)
    }
  }

  async function onSaveCredentials(data: CredentialsForm) {
    if (!selectedEmployeeId) {
      toast.error(t.access.employeeSelect)
      return
    }

    setSavingCredentials(true)
    try {
      await saveCredentials(selectedEmployeeId, {
        email: data.email,
        password: data.password,
      })
      toast.success(t.access.credentialsSaved)
      reset({ email: data.email, password: '' })
    } catch {
      toast.error('No se pudieron guardar las credenciales')
    } finally {
      setSavingCredentials(false)
    }
  }

  const accountColumns: ColumnDef<(typeof users)[number]>[] = [
    {
      accessorFn: (row) => row.empleado?.nombreCompleto ?? row.nombre,
      id: 'empleado',
      header: () => <span className="uppercase">{t.access.employee}</span>,
      cell: ({ row }) => <span className="font-medium">{row.original.empleado?.nombreCompleto ?? row.original.nombre}</span>,
    },
    {
      accessorKey: 'email',
      header: () => <span className="uppercase">{t.access.email}</span>,
    },
    {
      accessorFn: (row) => row.empleado?.position?.nombre ?? t.common.noRecord,
      id: 'position',
      header: () => <span className="uppercase">{t.common.position}</span>,
    },
    {
      accessorKey: 'rol',
      header: () => <span className="uppercase">Rol</span>,
    },
    {
      id: 'activo',
      accessorFn: (row) => row.activo,
      header: () => <span className="uppercase">{t.common.status}</span>,
      cell: ({ row }) => (
        <Badge className="uppercase" style={{ backgroundColor: row.original.activo ? '#648672' : '#9ca3af', color: 'white' }}>
          {row.original.activo ? t.common.active : t.common.inactive}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right uppercase">{t.common.actions}</div>,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!user.empleadoId) return
                setSelectedEmployeeId(user.empleadoId)
                setValue('email', user.email)
                setValue('password', '')
              }}
            >
              <Pencil className="h-4 w-4" />
              {t.common.edit}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title font-semibold uppercase">{t.access.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {t.access.description}
          </p>
        </div>
        <Badge className="uppercase" style={{ backgroundColor: '#ecd1c8', color: '#1a1a1a' }}>
          <Shield className="mr-1.5 h-3.5 w-3.5" />
          {t.access.accessManagerLabel}
        </Badge>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.loadingData}</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="uppercase">{t.access.permissionsTitle}</CardTitle>
              <CardDescription>{t.access.permissionsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="position">{t.access.positionLabel}</Label>
                  <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
                    <SelectTrigger id="position">
                      <SelectValue placeholder={t.access.selectPosition} />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2" style={{ borderColor: 'var(--border-color)' }}>
                  <Lock className="h-4 w-4" />
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {t.access.accessManagerLabel}
                    </p>
                    <button
                      type="button"
                      className="text-sm font-medium uppercase"
                      onClick={() => setDraftCanManageAccess((value) => !value)}
                    >
                      {draftCanManageAccess ? t.common.active : t.common.inactive}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                {SCREEN_CONFIG.map((screen) => {
                  const enabled = draftCanManageAccess || Boolean(draftPermissions[screen.key])
                  const disabled = draftCanManageAccess
                  return (
                    <button
                      key={screen.key}
                      type="button"
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-[var(--accent-hover)]"
                      style={{ borderColor: 'var(--border-color)' }}
                      onClick={() => {
                        if (disabled) return
                        setDraftPermissions((current) => ({
                          ...current,
                          [screen.key]: !current[screen.key],
                        }))
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.sidebar[screen.labelKey as keyof typeof t.sidebar]}</span>
                          {screen.path === '/' ? (
                            <Badge variant="secondary" className="uppercase text-[10px]">root</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {screen.path}
                        </p>
                      </div>
                      <Badge
                        className="uppercase"
                        style={{
                          backgroundColor: enabled ? '#648672' : '#9ca3af',
                          color: 'white',
                        }}
                      >
                        {enabled ? t.access.screenEnabled : t.access.screenDisabled}
                      </Badge>
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
                <div className="space-y-1">
                  <p className="text-sm font-medium uppercase">{selectedPosition?.nombre ?? t.common.noRecord}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {draftCanManageAccess ? t.access.allScreens : `${Object.values(draftPermissions).filter(Boolean).length} / ${SCREEN_CONFIG.length}`}
                  </p>
                </div>
                <Button onClick={handleSavePermissions} disabled={!selectedPosition || savingPermissions}>
                  <Save className="mr-1.5 h-4 w-4" />
                  {savingPermissions ? t.common.saving : t.access.savePermissions}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="uppercase">{t.access.credentialsTitle}</CardTitle>
              <CardDescription>{t.access.credentialsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t.access.employee}</Label>
                <Combobox
                  options={employeeOptions}
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  placeholder={t.access.employeeSelect}
                  searchPlaceholder={t.access.searchEmployee}
                  emptyMessage={t.access.noAccessUsers}
                />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {selectedEmployee ? `${selectedEmployee.nombreCompleto} · ${selectedEmployee.position?.nombre ?? t.common.noRecord}` : t.access.passwordHint}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit(onSaveCredentials)}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t.access.email}</Label>
                  <Input id="email" type="email" autoComplete="email" {...register('email')} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t.access.password}</Label>
                  <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
                  {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={savingCredentials}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  {savingCredentials ? t.common.saving : t.access.saveCredentials}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="uppercase">{t.access.accountStatus}</CardTitle>
          <CardDescription>{t.access.credentialsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={accountColumns}
            data={users}
            emptyMessage={t.access.noAccessUsers}
            searchPlaceholder={t.access.searchUser}
            labels={dataTableLabels}
          />
        </CardContent>
      </Card>
    </div>
  )
}
