'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, CornerDownRight, Info, Pencil, Shield, Trash2, UserPlus } from 'lucide-react'
import type { ColumnDef } from '@cosmetics/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { AccessPermission, AccessUser } from '@/hooks/useAccessAdmin'
import { SCREEN_CONFIG } from '@/lib/access'
import { useI18n } from '@/lib/i18n'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().optional().or(z.literal('')),
})

type CredentialsForm = z.infer<typeof credentialsSchema>

const GENERATE_ENVELOPE_PERMISSION_KEY = 'ventas/generar-sobre' as const
const ACCESS_PERMISSION_KEYS = [...SCREEN_CONFIG.map((screen) => screen.key), GENERATE_ENVELOPE_PERMISSION_KEY]

function getApiMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) {
      return response.data.message
    }
  }

  return fallback
}

export default function AccessControlPage() {
  const { t, dataTableLabels } = useI18n()
  const { positions, employees, users, loading, error, savePositionPermissions, saveCredentials, deleteUser } = useAccessAdmin()
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [draftCanManageAccess, setDraftCanManageAccess] = useState(false)
  const [draftPermissions, setDraftPermissions] = useState<Record<string, boolean>>({})
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false)
  const [credentialsConfirmOpen, setCredentialsConfirmOpen] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<{ employeeId: string; isUpdate: boolean; data: CredentialsForm } | null>(null)
  const [userToDelete, setUserToDelete] = useState<AccessUser | null>(null)
  const permissionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const permissionSaveInFlightRef = useRef(false)
  const permissionLatestSnapshotRef = useRef<{
    positionId: string
    canManageAccess: boolean
    permissions: Array<{ screenKey: string; allowed: boolean }>
    signature: string
  } | null>(null)
  const committedCanManageAccessRef = useRef(false)
  const committedPermissionMapRef = useRef<Record<string, boolean>>({})

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

  const selectedPermissionMap = useMemo(() => {
    if (!selectedPosition) {
      return null
    }

    return Object.fromEntries(
      ACCESS_PERMISSION_KEYS.map((screenKey) => [
        screenKey,
        selectedPosition.canManageAccess
          || selectedPosition.screenPermissions.some((permission) => permission.screenKey === screenKey && permission.allowed),
      ]),
    ) as Record<string, boolean>
  }, [selectedPosition])

  const permissionStateChanged = useMemo(() => {
    if (!selectedPosition || !selectedPermissionMap) {
      return false
    }

    if (draftCanManageAccess !== committedCanManageAccessRef.current) {
      return true
    }

    return ACCESS_PERMISSION_KEYS.some((screenKey) => Boolean(draftPermissions[screenKey]) !== Boolean(committedPermissionMapRef.current[screenKey]))
  }, [draftCanManageAccess, draftPermissions, selectedPermissionMap, selectedPosition])

  const enabledScreenCount = useMemo(
    () => (draftCanManageAccess ? ACCESS_PERMISSION_KEYS.length : Object.values(draftPermissions).filter(Boolean).length),
    [draftCanManageAccess, draftPermissions],
  )

  function togglePermission(permissionKey: string) {
    const nextPermissions = {
      ...draftPermissions,
      [permissionKey]: !draftPermissions[permissionKey],
    }
    setDraftPermissions(nextPermissions)
    schedulePermissionSave(draftCanManageAccess, nextPermissions)
  }

  useEffect(() => {
    if (!selectedPositionId && positions[0]) {
      setSelectedPositionId(positions[0].id)
      return
    }

    if (!selectedPosition || !selectedPermissionMap) {
      return
    }

    setDraftCanManageAccess(selectedPosition.canManageAccess)
    setDraftPermissions(selectedPermissionMap)
    committedCanManageAccessRef.current = selectedPosition.canManageAccess
    committedPermissionMapRef.current = selectedPermissionMap
  }, [positions, selectedPermissionMap, selectedPosition, selectedPositionId])

  useEffect(() => {
    return () => {
      if (permissionSaveTimerRef.current) {
        clearTimeout(permissionSaveTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!selectedEmployeeId) {
      reset({ email: '', password: '' })
      return
    }

    if (selectedUser) {
      setValue('email', selectedUser.email)
      setValue('password', '')
      return
    }

    reset({ email: '', password: '' })
  }, [reset, selectedEmployeeId, selectedUser, setValue])

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: employee.nombreCompleto,
      })),
    [employees],
  )

  function openEmployeeEditor(user: AccessUser) {
    if (!user.empleadoId) {
      return
    }

    setSelectedEmployeeId(user.empleadoId)
    setValue('email', user.email)
    setValue('password', '')
    setCredentialsDialogOpen(true)
  }

  function openCredentialsDialog() {
    if (!selectedEmployeeId) {
      toast.error(t.access.employeeSelect)
      return
    }

    setValue('email', selectedUser?.email ?? '')
    setValue('password', '')
    setCredentialsDialogOpen(true)
  }

  function schedulePermissionSave(nextCanManageAccess: boolean, nextPermissions: Record<string, boolean>) {
    if (!selectedPosition) {
      return
    }

    const snapshot: {
      positionId: string
      canManageAccess: boolean
      permissions: AccessPermission[]
    } = {
      positionId: selectedPosition.id,
      canManageAccess: nextCanManageAccess,
      permissions: ACCESS_PERMISSION_KEYS.map((screenKey): AccessPermission => ({
        screenKey: screenKey as AccessPermission['screenKey'],
        allowed: nextCanManageAccess ? true : Boolean(nextPermissions[screenKey]),
      })),
    }

    permissionLatestSnapshotRef.current = {
      ...snapshot,
      signature: JSON.stringify(snapshot),
    }

    if (permissionSaveTimerRef.current) {
      clearTimeout(permissionSaveTimerRef.current)
    }

    permissionSaveTimerRef.current = setTimeout(() => {
      const flush = async () => {
        const current = permissionLatestSnapshotRef.current
        if (!current || permissionSaveInFlightRef.current) {
          return
        }

        permissionSaveInFlightRef.current = true
        setSavingPermissions(true)

        try {
          await savePositionPermissions(
            current.positionId,
            {
              canManageAccess: current.canManageAccess,
              permissions: current.permissions as AccessPermission[],
            },
            { refetch: false },
          )

          committedCanManageAccessRef.current = current.canManageAccess
          committedPermissionMapRef.current = Object.fromEntries(
            current.permissions.map((permission) => [permission.screenKey, permission.allowed]),
          ) as Record<string, boolean>
          toast.success(t.access.permissionsSaved)
        } catch (error) {
          setDraftCanManageAccess(committedCanManageAccessRef.current)
          setDraftPermissions(committedPermissionMapRef.current)
          toast.error(getApiMessage(error, 'No se pudieron guardar los permisos'))
        } finally {
          permissionSaveInFlightRef.current = false
          setSavingPermissions(false)

          const latest = permissionLatestSnapshotRef.current
          if (latest && latest.signature !== current.signature) {
            void flush()
          }
        }
      }

      void flush()
    }, 250)
  }

  const requestSaveCredentials = handleSubmit((data) => {
    if (!selectedEmployeeId || !selectedEmployee) {
      toast.error(t.access.employeeSelect)
      return
    }

    if (!selectedUser && !data.password?.trim()) {
      toast.error(t.access.passwordRequiredHelp)
      return
    }

    setPendingCredentials({
      employeeId: selectedEmployeeId,
      isUpdate: Boolean(selectedUser),
      data,
    })
    setCredentialsConfirmOpen(true)
  })

  async function confirmSaveCredentials() {
    if (!pendingCredentials) {
      return
    }

    setSavingCredentials(true)
    try {
      const payload = {
        email: pendingCredentials.data.email,
        ...(pendingCredentials.data.password?.trim()
          ? { password: pendingCredentials.data.password }
          : {}),
      }

      await saveCredentials(pendingCredentials.employeeId, payload)
      toast.success(pendingCredentials.isUpdate ? t.access.credentialsUpdated : t.access.credentialsCreated)
      setCredentialsConfirmOpen(false)
      setCredentialsDialogOpen(false)
      setPendingCredentials(null)
      reset({ email: pendingCredentials.data.email, password: '' })
    } catch (error) {
      toast.error(getApiMessage(error, 'No se pudieron guardar las credenciales'))
    } finally {
      setSavingCredentials(false)
    }
  }

  async function confirmDeleteUser() {
    if (!userToDelete) {
      return
    }

    if (userToDelete.rol === 'SUPER_ADMIN') {
      toast.error('La cuenta principal no se puede desactivar')
      setUserToDelete(null)
      return
    }

    try {
      await deleteUser(userToDelete.id)
      toast.success(t.access.accountDeleted)
      if (userToDelete.empleadoId === selectedEmployeeId) {
        setSelectedEmployeeId('')
        reset({ email: '', password: '' })
      }
      setUserToDelete(null)
    } catch (error) {
      toast.error(getApiMessage(error, 'No se pudo desactivar la cuenta'))
    }
  }

  const accountColumns: ColumnDef<AccessUser>[] = [
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
              onClick={() => openEmployeeEditor(user)}
              disabled={!user.empleadoId}
            >
              <Pencil className="h-4 w-4" />
              {t.common.edit}
            </Button>
            {user.rol !== 'SUPER_ADMIN' ? (
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600"
                onClick={() => {
                  setUserToDelete(user)
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t.common.delete}
              </Button>
            ) : null}
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
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t.common.loadingData}
        </p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="uppercase">{t.access.permissionsTitle}</CardTitle>
              <CardDescription>{t.access.permissionsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium uppercase tracking-wide">
                      {savingPermissions || permissionStateChanged ? t.common.saving : t.access.permissionsSavedState}
                    </p>
                    <Badge className="uppercase" style={{ backgroundColor: '#648672', color: 'white' }}>
                      {t.access.permissionsSelectedCount(enabledScreenCount)}
                    </Badge>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {t.access.permissionsHint}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="position">{t.access.positionLabel}</Label>
                  <Select
                    value={selectedPositionId}
                    onValueChange={setSelectedPositionId}
                  >
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
              </div>

              <div className="grid gap-3">
                {SCREEN_CONFIG.map((screen) => {
                  const enabled = Boolean(draftPermissions[screen.key])
                  const pending = enabled !== Boolean(committedPermissionMapRef.current[screen.key])

                  if (screen.key === 'ventas') {
                    const generateEnabled = Boolean(draftPermissions[GENERATE_ENVELOPE_PERMISSION_KEY])
                    const generatePending = generateEnabled !== Boolean(committedPermissionMapRef.current[GENERATE_ENVELOPE_PERMISSION_KEY])

                    return (
                      <div key={screen.key} className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                        <button
                          type="button"
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors duration-200 ${
                            enabled ? 'border-[#8bb09b] bg-[#648672]/10' : 'hover:border-slate-300 hover:bg-slate-50'
                          }`}
                          style={{ borderColor: 'var(--border-color)' }}
                          onClick={() => {
                            togglePermission(screen.key)
                          }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t.sidebar[screen.labelKey as keyof typeof t.sidebar]}</span>
                              <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">
                                {t.access.primaryScreen}
                              </Badge>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {screen.path}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {enabled ? <Check className="h-4 w-4 text-[#648672]" /> : null}
                            <Badge
                              className="uppercase"
                              style={{
                                backgroundColor: pending ? '#f59e0b' : enabled ? '#648672' : '#9ca3af',
                                color: 'white',
                              }}
                            >
                              {pending ? t.common.saving : enabled ? t.access.screenEnabled : t.access.screenDisabled}
                            </Badge>
                          </div>
                        </button>

                        <button
                          type="button"
                          className={`flex w-full items-stretch gap-3 rounded-xl border border-dashed px-4 py-3 text-left transition-colors duration-200 ${
                            generateEnabled
                              ? 'border-[#8bb09b] bg-[#648672]/10'
                              : 'hover:border-slate-300 hover:bg-slate-50'
                          }`}
                          style={{ borderColor: 'var(--border-color)' }}
                          onClick={() => {
                            togglePermission(GENERATE_ENVELOPE_PERMISSION_KEY)
                          }}
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#648672]/10 text-[#648672]">
                            <CornerDownRight className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t.access.generateEnvelopePermission}</span>
                              <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">
                                {t.access.salesAction}
                              </Badge>
                            </div>
                            <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                              {t.access.generateEnvelopePermissionDescription}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {generateEnabled ? <Check className="h-4 w-4 text-[#648672]" /> : null}
                            <Badge
                              className="uppercase"
                              style={{
                                backgroundColor: generatePending ? '#f59e0b' : generateEnabled ? '#648672' : '#9ca3af',
                                color: 'white',
                              }}
                            >
                              {generatePending
                                ? t.common.saving
                                : generateEnabled
                                  ? t.access.screenEnabled
                                  : t.access.screenDisabled}
                            </Badge>
                          </div>
                        </button>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={screen.key}
                      type="button"
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors duration-200 ${
                        enabled ? 'border-[#8bb09b] bg-[#648672]/10' : 'hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      style={{ borderColor: 'var(--border-color)' }}
                      onClick={() => {
                        const nextPermissions = {
                          ...draftPermissions,
                          [screen.key]: !enabled,
                        }
                        setDraftPermissions(nextPermissions)
                        schedulePermissionSave(draftCanManageAccess, nextPermissions)
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.sidebar[screen.labelKey as keyof typeof t.sidebar]}</span>
                          {screen.path === '/' ? (
                            <Badge variant="secondary" className="uppercase text-[10px]">
                              root
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {screen.path}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {enabled ? <Check className="h-4 w-4 text-[#648672]" /> : null}
                        <Badge
                          className="uppercase"
                          style={{
                            backgroundColor: pending ? '#f59e0b' : enabled ? '#648672' : '#9ca3af',
                            color: 'white',
                          }}
                        >
                          {pending ? t.common.saving : enabled ? t.access.screenEnabled : t.access.screenDisabled}
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
                <div className="space-y-1">
                  <p className="text-sm font-medium uppercase">
                    {selectedPosition?.nombre ?? t.common.noRecord}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {draftCanManageAccess ? t.access.allScreens : `${enabledScreenCount} / ${ACCESS_PERMISSION_KEYS.length}`}
                  </p>
                </div>
                <Badge className="uppercase" style={{ backgroundColor: '#ecd1c8', color: '#1a1a1a' }}>
                  {savingPermissions || permissionStateChanged ? t.common.saving : t.access.permissionsSavedState}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
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
                  emptyMessage={t.access.noEmployeesAvailable}
                />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {selectedEmployee
                    ? `${selectedEmployee.nombreCompleto} · ${selectedEmployee.position?.nombre ?? t.common.noRecord}`
                    : t.access.accountEditHint}
                </p>
              </div>

              <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium uppercase tracking-wide">
                      {selectedUser ? t.access.editCredentialTitle : t.access.createCredentialTitle}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {selectedEmployee
                        ? `${selectedEmployee.nombreCompleto} · ${selectedEmployee.position?.nombre ?? t.common.noRecord}`
                        : t.access.passwordHint}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={openCredentialsDialog}
                    disabled={!selectedEmployeeId}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    {selectedUser ? t.access.updateCredentials : t.access.saveCredentials}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="uppercase">{t.access.accountStatus}</CardTitle>
          <CardDescription>{t.access.accountEditHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t.access.accountDeleteHint}
          </p>
          <DataTable
            columns={accountColumns}
            data={users}
            emptyMessage={t.access.noAccessUsers}
            searchPlaceholder={t.access.searchUser}
            labels={dataTableLabels}
          />
        </CardContent>
      </Card>

      <Dialog
        open={credentialsDialogOpen}
        onOpenChange={(open) => {
          setCredentialsDialogOpen(open)
          if (!open) {
            setPendingCredentials(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? t.access.editCredentialTitle : t.access.createCredentialTitle}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? `${selectedEmployee.nombreCompleto} · ${selectedEmployee.position?.nombre ?? t.common.noRecord}`
                : t.access.passwordHint}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 pt-2" onSubmit={requestSaveCredentials}>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCredentialsDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={savingCredentials}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                {savingCredentials ? t.common.saving : selectedUser ? t.access.updateCredentials : t.access.saveCredentials}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={credentialsConfirmOpen} onOpenChange={setCredentialsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.access.saveCredentialsConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedEmployee?.nombreCompleto ?? t.common.noRecord}</strong> {t.access.saveCredentialsConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingCredentials(null)
              }}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#648672] hover:bg-[#4f6a5a]"
              onClick={() => {
                void confirmSaveCredentials()
              }}
            >
              {selectedUser ? t.access.updateCredentials : t.access.saveCredentials}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setUserToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.access.deleteAccountTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.common.deleteCannotUndo} {t.access.deleteAccountDescription}{' '}
              <strong>{userToDelete?.empleado?.nombreCompleto ?? userToDelete?.nombre ?? t.common.noRecord}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                void confirmDeleteUser()
              }}
            >
              {t.access.deleteAccountCta}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
