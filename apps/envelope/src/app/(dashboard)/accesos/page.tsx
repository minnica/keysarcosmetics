'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Check,
  CornerDownRight,
  Pencil,
  Shield,
  Trash2,
  UserPlus,
} from 'lucide-react'
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
  Separator,
  SelectTrigger,
  SelectValue,
  toast,
} from '@cosmetics/ui'
import { useAccessAdmin } from '@/hooks'
import type { AccessPermission, AccessUser } from '@/hooks/useAccessAdmin'
import { SCREEN_CONFIG, SECTION_ORDER, type AccessSection } from '@/lib/access'
import { useI18n } from '@/lib/i18n'
import { AccessLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { actionButtonStyles } from '@/lib/action-button-styles'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().optional().or(z.literal('')),
})

type CredentialsForm = z.infer<typeof credentialsSchema>

const GENERATE_ENVELOPE_PERMISSION_KEY = 'ventas/generar-sobre' as const
const EMPLOYEE_SALARY_PERMISSION_KEY = 'empleados/sueldo' as const
const KEYSAR_HOME_DATA_PERMISSION_KEY =
  'reportes/ver-datos-keysar-home' as const
const ACCESS_PERMISSION_KEYS = [
  ...SCREEN_CONFIG.map((screen) => screen.key),
  GENERATE_ENVELOPE_PERMISSION_KEY,
  EMPLOYEE_SALARY_PERMISSION_KEY,
  KEYSAR_HOME_DATA_PERMISSION_KEY,
]

const SCREEN_ACTIONS: Partial<
  Record<
    string,
    {
      key: string
      label: 'generateEnvelopePermission' | 'viewSalaryPermission'
      description:
        | 'generateEnvelopePermissionDescription'
        | 'viewSalaryPermissionDescription'
    }
  >
> = {
  ventas: {
    key: GENERATE_ENVELOPE_PERMISSION_KEY,
    label: 'generateEnvelopePermission',
    description: 'generateEnvelopePermissionDescription',
  },
  empleados: {
    key: EMPLOYEE_SALARY_PERMISSION_KEY,
    label: 'viewSalaryPermission',
    description: 'viewSalaryPermissionDescription',
  },
}

const SECTION_LABELS: Record<
  AccessSection,
  'forms' | 'reports' | 'rankings' | 'accessControl'
> = {
  forms: 'forms',
  reports: 'reports',
  rankings: 'rankings',
  admin: 'accessControl',
}

function getApiMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response
    if (response?.data?.message) {
      return response.data.message
    }
  }

  return fallback
}

export default function AccessControlPage() {
  const { t, dataTableLabels } = useI18n()
  const {
    positions,
    employees,
    users,
    loading,
    error,
    savePositionPermissions,
    saveCredentials,
    deleteUser,
  } = useAccessAdmin()
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [draftCanManageAccess, setDraftCanManageAccess] = useState(false)
  const [draftSelfDataOnly, setDraftSelfDataOnly] = useState(false)
  const [draftPermissions, setDraftPermissions] = useState<
    Record<string, boolean>
  >({})
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false)
  const [credentialsConfirmOpen, setCredentialsConfirmOpen] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<{
    employeeId: string
    isUpdate: boolean
    data: CredentialsForm
  } | null>(null)
  const [userToDelete, setUserToDelete] = useState<AccessUser | null>(null)
  const permissionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const permissionSaveInFlightRef = useRef(false)
  const permissionLatestSnapshotRef = useRef<{
    positionId: string
    canManageAccess: boolean
    selfDataOnly: boolean
    permissions: Array<{ screenKey: string; allowed: boolean }>
    signature: string
  } | null>(null)
  const committedCanManageAccessRef = useRef(false)
  const committedSelfDataOnlyRef = useRef(false)
  const committedPermissionMapRef = useRef<Record<string, boolean>>({})

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  })

  const selectedPosition = useMemo(
    () =>
      positions.find((position) => position.id === selectedPositionId) ?? null,
    [positions, selectedPositionId],
  )

  const selectedEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
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
        selectedPosition.canManageAccess ||
          selectedPosition.screenPermissions.some(
            (permission) =>
              permission.screenKey === screenKey && permission.allowed,
          ),
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

    if (draftSelfDataOnly !== committedSelfDataOnlyRef.current) {
      return true
    }

    return ACCESS_PERMISSION_KEYS.some(
      (screenKey) =>
        Boolean(draftPermissions[screenKey]) !==
        Boolean(committedPermissionMapRef.current[screenKey]),
    )
  }, [
    draftCanManageAccess,
    draftPermissions,
    draftSelfDataOnly,
    selectedPermissionMap,
    selectedPosition,
  ])

  const enabledScreenCount = useMemo(
    () =>
      draftCanManageAccess
        ? ACCESS_PERMISSION_KEYS.length
        : Object.values(draftPermissions).filter(Boolean).length,
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

  function setSectionPermissions(section: AccessSection, allowed: boolean) {
    const screenKeys = SCREEN_CONFIG.filter(
      (screen) => screen.section === section,
    ).flatMap(
      (screen) =>
        [screen.key, SCREEN_ACTIONS[screen.key]?.key].filter(
          Boolean,
        ) as string[],
    )

    const nextPermissions = { ...draftPermissions }
    screenKeys.forEach((permissionKey) => {
      nextPermissions[permissionKey] = allowed
    })
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
    setDraftSelfDataOnly(selectedPosition.selfDataOnly)
    setDraftPermissions(selectedPermissionMap)
    committedCanManageAccessRef.current = selectedPosition.canManageAccess
    committedSelfDataOnlyRef.current = selectedPosition.selfDataOnly
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

  function schedulePermissionSave(
    nextCanManageAccess: boolean,
    nextPermissions: Record<string, boolean>,
    nextSelfDataOnly = draftSelfDataOnly,
  ) {
    if (!selectedPosition) {
      return
    }

    const snapshot: {
      positionId: string
      canManageAccess: boolean
      selfDataOnly: boolean
      permissions: AccessPermission[]
    } = {
      positionId: selectedPosition.id,
      canManageAccess: nextCanManageAccess,
      selfDataOnly: nextSelfDataOnly,
      permissions: ACCESS_PERMISSION_KEYS.map(
        (screenKey): AccessPermission => ({
          screenKey: screenKey as AccessPermission['screenKey'],
          allowed: nextCanManageAccess
            ? true
            : Boolean(nextPermissions[screenKey]),
        }),
      ),
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
              selfDataOnly: current.selfDataOnly,
              permissions: current.permissions as AccessPermission[],
            },
            { refetch: false },
          )

          committedCanManageAccessRef.current = current.canManageAccess
          committedSelfDataOnlyRef.current = current.selfDataOnly
          committedPermissionMapRef.current = Object.fromEntries(
            current.permissions.map((permission) => [
              permission.screenKey,
              permission.allowed,
            ]),
          ) as Record<string, boolean>
          toast.success(t.access.permissionsSaved)
        } catch (error) {
          setDraftCanManageAccess(committedCanManageAccessRef.current)
          setDraftSelfDataOnly(committedSelfDataOnlyRef.current)
          setDraftPermissions(committedPermissionMapRef.current)
          toast.error(
            getApiMessage(error, 'No se pudieron guardar los permisos'),
          )
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
      toast.success(
        pendingCredentials.isUpdate
          ? t.access.credentialsUpdated
          : t.access.credentialsCreated,
      )
      setCredentialsConfirmOpen(false)
      setCredentialsDialogOpen(false)
      setPendingCredentials(null)
      reset({ email: pendingCredentials.data.email, password: '' })
    } catch (error) {
      toast.error(
        getApiMessage(error, 'No se pudieron guardar las credenciales'),
      )
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

  const keysarHomeDataEnabled = Boolean(
    draftPermissions[KEYSAR_HOME_DATA_PERMISSION_KEY],
  )
  const keysarHomeDataPending =
    keysarHomeDataEnabled !==
    Boolean(committedPermissionMapRef.current[KEYSAR_HOME_DATA_PERMISSION_KEY])
  const selfDataOnlyPending =
    draftSelfDataOnly !== committedSelfDataOnlyRef.current

  const accountColumns: ColumnDef<AccessUser>[] = [
    {
      accessorFn: (row) => row.empleado?.nombreCompleto ?? row.nombre,
      id: 'empleado',
      header: () => <span className="uppercase">{t.access.employee}</span>,
      cell: ({ row }) => (
        <span className="block min-w-[11rem] max-w-[16rem] whitespace-normal font-medium leading-5">
          {row.original.empleado?.nombreCompleto ?? row.original.nombre}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: () => <span className="uppercase">{t.access.email}</span>,
      cell: ({ row }) => (
        <span className="block min-w-[12rem] max-w-[18rem] break-all">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorFn: (row) => row.empleado?.position?.nombre ?? t.common.noRecord,
      id: 'position',
      header: () => <span className="uppercase">{t.common.position}</span>,
    },
    {
      id: 'activo',
      accessorFn: (row) => row.activo,
      header: () => <span className="uppercase">{t.common.status}</span>,
      cell: ({ row }) => (
        <Badge
          className={`uppercase ${
            row.original.activo
              ? 'bg-[#648672] text-white dark:bg-[#8bb09b] dark:text-[#1a1a1a]'
              : 'bg-[#606060] text-white dark:bg-[#4a4a4a]'
          }`}
        >
          {row.original.activo ? t.common.active : t.common.inactive}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: () => (
        <div className="text-right uppercase">{t.common.actions}</div>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex min-w-[10rem] flex-col justify-end gap-2 sm:flex-row">
            <Button
              size="sm"
              variant="outline"
              className={`${actionButtonStyles.neutral} w-full justify-center whitespace-nowrap sm:w-auto`}
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
                className={`${actionButtonStyles.danger} w-full justify-center whitespace-nowrap sm:w-auto`}
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
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="min-w-0">
          <h1 className="page-title uppercase">{t.access.title}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {t.access.description}
          </p>
        </div>
        <Badge
          className="max-w-full bg-[#ecd1c8] text-[#1a1a1a] uppercase dark:bg-[#c3a583] dark:text-[#1a1a1a]"
        >
          <Shield className="mr-1.5 h-3.5 w-3.5" />
          {t.access.accessManagerLabel}
        </Badge>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      )}

      {loading ? (
        <AccessLoadingSkeleton />
      ) : (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)]">
          <Card className="min-w-0">
            <CardHeader className="space-y-2">
              <CardTitle className="uppercase">
                {t.access.permissionsTitle}
              </CardTitle>
              <CardDescription>
                {t.access.permissionsDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                {selectedPosition && !draftCanManageAccess ? (
                  <fieldset
                    className="space-y-3 rounded-xl border p-3 sm:p-4"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <legend className="sr-only">
                      {t.access.dataScopeTitle}
                    </legend>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p
                          id="position-data-scope-title"
                          className="text-sm font-semibold"
                        >
                          {t.access.dataScopeTitle}
                        </p>
                        <p
                          className="text-xs leading-5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t.access.dataScopeDescription}
                        </p>
                      </div>
                      <Badge
                        variant={
                          selfDataOnlyPending || keysarHomeDataPending
                            ? 'default'
                            : 'secondary'
                        }
                        className="w-fit shrink-0 uppercase"
                      >
                        {selfDataOnlyPending || keysarHomeDataPending
                          ? t.common.saving
                          : t.access.permissionsSavedState}
                      </Badge>
                    </div>

                    <div
                      role="radiogroup"
                      aria-labelledby="position-data-scope-title"
                      className="grid gap-2 md:grid-cols-2"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={!draftSelfDataOnly}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648672] focus-visible:ring-offset-2 dark:focus-visible:ring-[#8bb09b] dark:focus-visible:ring-offset-[#252525] ${
                          !draftSelfDataOnly
                            ? 'border-[#648672] bg-[#648672]/10 dark:border-[#8bb09b] dark:bg-[#648672]/25'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-900/40'
                        }`}
                        onClick={() => {
                          if (!draftSelfDataOnly) return
                          setDraftSelfDataOnly(false)
                          schedulePermissionSave(
                            draftCanManageAccess,
                            draftPermissions,
                            false,
                          )
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            !draftSelfDataOnly
                              ? 'border-[#648672] bg-[#648672] text-white'
                              : 'border-slate-400 dark:border-slate-500'
                          }`}
                        >
                          {!draftSelfDataOnly ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {t.access.allRecordsOption}
                          </span>
                          <span
                            className="mt-1 block text-xs leading-5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t.access.allRecordsDescription}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={draftSelfDataOnly}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648672] focus-visible:ring-offset-2 dark:focus-visible:ring-[#8bb09b] dark:focus-visible:ring-offset-[#252525] ${
                          draftSelfDataOnly
                            ? 'border-[#648672] bg-[#648672]/10 dark:border-[#8bb09b] dark:bg-[#648672]/25'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-900/40'
                        }`}
                        onClick={() => {
                          if (draftSelfDataOnly) return
                          setDraftSelfDataOnly(true)
                          schedulePermissionSave(
                            draftCanManageAccess,
                            draftPermissions,
                            true,
                          )
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            draftSelfDataOnly
                              ? 'border-[#648672] bg-[#648672] text-white'
                              : 'border-slate-400 dark:border-slate-500'
                          }`}
                        >
                          {draftSelfDataOnly ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {t.access.ownRecordsOption}
                          </span>
                          <span
                            className="mt-1 block text-xs leading-5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t.access.ownRecordsDescription}
                          </span>
                        </span>
                      </button>
                    </div>

                    <div
                      className="border-t pt-3"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <button
                        type="button"
                        aria-pressed={keysarHomeDataEnabled}
                        className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648672] focus-visible:ring-offset-2 dark:focus-visible:ring-[#8bb09b] dark:focus-visible:ring-offset-[#252525] ${
                          keysarHomeDataEnabled
                            ? 'bg-[#648672]/10 text-[#355241] dark:bg-[#648672]/25 dark:text-[#c6dfce]'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                        }`}
                        onClick={() =>
                          togglePermission(KEYSAR_HOME_DATA_PERMISSION_KEY)
                        }
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            keysarHomeDataEnabled
                              ? 'border-[#648672] bg-[#648672] text-white'
                              : 'border-slate-400 bg-white dark:border-slate-500 dark:bg-[#303030]'
                          }`}
                        >
                          {keysarHomeDataEnabled ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {t.access.viewKeysarHomeDataPermission}
                          </span>
                          <span
                            className="mt-1 block text-xs leading-5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t.access.viewKeysarHomeDataPermissionDescription}
                          </span>
                          {draftSelfDataOnly ? (
                            <span className="mt-1.5 block text-xs font-medium leading-5 text-amber-700 dark:text-amber-300">
                              {t.access.viewKeysarHomeOwnScopeHint}
                            </span>
                          ) : null}
                        </span>
                        {keysarHomeDataPending ? (
                          <span className="shrink-0 text-xs text-amber-600 dark:text-amber-300">
                            {t.common.saving}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  </fieldset>
                ) : null}

                {SECTION_ORDER.map((section) => {
                  const screens = SCREEN_CONFIG.filter(
                    (screen) => screen.section === section,
                  )
                  const permissionKeys = screens.flatMap(
                    (screen) =>
                      [screen.key, SCREEN_ACTIONS[screen.key]?.key].filter(
                        Boolean,
                      ) as string[],
                  )
                  const enabledInSection = permissionKeys.filter(
                    (permissionKey) => draftPermissions[permissionKey],
                  ).length

                  return (
                    <section
                      key={section}
                      className="overflow-hidden rounded-xl border"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div
                        className="flex flex-col gap-3 border-b bg-slate-50/70 px-3 py-3 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:px-4"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-baseline gap-2">
                          <h2 className="section-heading uppercase">
                            {t.sidebar[SECTION_LABELS[section]]}
                          </h2>
                          <span
                            className="text-xs"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t.access.screensSelected(
                              enabledInSection,
                              permissionKeys.length,
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSectionPermissions(section, true)}
                          >
                            {t.access.selectAll}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSectionPermissions(section, false)
                            }
                          >
                            {t.access.clearAll}
                          </Button>
                        </div>
                      </div>

                      <div
                        className="divide-y"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        {screens.map((screen) => {
                          const enabled = Boolean(draftPermissions[screen.key])
                          const pending =
                            enabled !==
                            Boolean(
                              committedPermissionMapRef.current[screen.key],
                            )
                          const action = SCREEN_ACTIONS[screen.key]
                          const actionEnabled = action
                            ? Boolean(draftPermissions[action.key])
                            : false
                          const actionPending = action
                            ? actionEnabled !==
                              Boolean(
                                committedPermissionMapRef.current[action.key],
                              )
                            : false

                          return (
                            <div
                              key={screen.key}
                              className="px-3 py-2.5 sm:px-4"
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  aria-pressed={enabled}
                                  className={`flex min-w-0 flex-1 items-center gap-3 rounded-md px-1.5 py-1 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648672] dark:focus-visible:ring-[#8bb09b] ${enabled ? 'text-[#355241] dark:text-[#c6dfce]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                                  onClick={() => togglePermission(screen.key)}
                                >
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${enabled ? 'border-[#648672] bg-[#648672] text-white dark:border-[#8bb09b]' : 'border-slate-300 bg-white dark:border-slate-500 dark:bg-[#303030]'}`}
                                  >
                                    {enabled ? (
                                      <Check className="h-3.5 w-3.5" />
                                    ) : null}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {
                                      t.sidebar[
                                        screen.labelKey as keyof typeof t.sidebar
                                      ]
                                    }
                                  </span>
                                  {pending ? (
                                    <span className="text-xs text-amber-600 dark:text-amber-300">
                                      {t.common.saving}
                                    </span>
                                  ) : null}
                                </button>
                                <Badge
                                  className={`shrink-0 uppercase ${
                                    enabled
                                      ? 'bg-[#648672] text-white dark:bg-[#8bb09b] dark:text-[#1a1a1a]'
                                      : 'bg-[#606060] text-white dark:bg-[#4a4a4a]'
                                  }`}
                                >
                                  {enabled
                                    ? t.access.screenEnabled
                                    : t.access.screenDisabled}
                                </Badge>
                              </div>

                              {action ? (
                                <button
                                  type="button"
                                  aria-pressed={actionEnabled}
                                  title={t.access[action.description]}
                                  className={`mt-1.5 ml-8 flex w-[calc(100%-2rem)] items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648672] dark:focus-visible:ring-[#8bb09b] ${actionEnabled ? 'text-[#355241] dark:text-[#c6dfce]' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]'}`}
                                  onClick={() => togglePermission(action.key)}
                                >
                                  <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                                  <span className="min-w-0 flex-1 truncate">
                                    {t.access[action.label]}
                                  </span>
                                  <span
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${actionEnabled ? 'border-[#648672] bg-[#648672] text-white dark:border-[#8bb09b]' : 'border-slate-300 bg-white dark:border-slate-500 dark:bg-[#303030]'}`}
                                  >
                                    {actionEnabled ? (
                                      <Check className="h-3 w-3" />
                                    ) : null}
                                  </span>
                                  {actionPending ? (
                                    <span className="text-amber-600 dark:text-amber-300">
                                      {t.common.saving}
                                    </span>
                                  ) : null}
                                </button>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>

              <div
                className="flex flex-col items-start justify-between gap-3 rounded-md border px-3 py-3 sm:flex-row sm:items-center sm:px-4"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium uppercase">
                    {selectedPosition?.nombre ?? t.common.noRecord}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {draftCanManageAccess
                      ? t.access.allScreens
                      : `${enabledScreenCount} / ${ACCESS_PERMISSION_KEYS.length}`}
                  </p>
                </div>
                <Badge
                  className="bg-[#ecd1c8] text-[#1a1a1a] uppercase dark:bg-[#c3a583] dark:text-[#1a1a1a]"
                >
                  {savingPermissions || permissionStateChanged
                    ? t.common.saving
                    : t.access.permissionsSavedState}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="space-y-2">
              <CardTitle className="uppercase">
                {t.access.credentialsTitle}
              </CardTitle>
              <CardDescription>
                {t.access.credentialsDescription}
              </CardDescription>
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

              <div
                className="rounded-lg border px-3 py-3 sm:px-4"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium uppercase tracking-wide">
                      {selectedUser
                        ? t.access.editCredentialTitle
                        : t.access.createCredentialTitle}
                    </p>
                    <p
                      className="text-sm leading-5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {selectedEmployee
                        ? `${selectedEmployee.nombreCompleto} · ${selectedEmployee.position?.nombre ?? t.common.noRecord}`
                        : t.access.passwordHint}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full justify-center sm:w-auto"
                    onClick={openCredentialsDialog}
                    disabled={!selectedEmployeeId}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    {selectedUser
                      ? t.access.updateCredentials
                      : t.access.saveCredentials}
                  </Button>
                </div>
              </div>

              <Separator />

              <section className="space-y-3">
                <div className="space-y-1">
                  <h2 className="section-heading uppercase">
                    {t.access.accountStatus}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {t.access.accountDeleteHint}
                  </p>
                </div>
                <DataTable
                  columns={accountColumns}
                  data={users}
                  emptyMessage={t.access.noAccessUsers}
                  searchPlaceholder={t.access.searchUser}
                  labels={dataTableLabels}
                />
              </section>
            </CardContent>
          </Card>
        </div>
      )}

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
              {selectedUser
                ? t.access.editCredentialTitle
                : t.access.createCredentialTitle}
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
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-600 dark:text-red-300">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t.access.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-600 dark:text-red-300">
                  {errors.password.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCredentialsDialogOpen(false)}
              >
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={savingCredentials}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                {savingCredentials
                  ? t.common.saving
                  : selectedUser
                    ? t.access.updateCredentials
                    : t.access.saveCredentials}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={credentialsConfirmOpen}
        onOpenChange={setCredentialsConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.access.saveCredentialsConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>
                {selectedEmployee?.nombreCompleto ?? t.common.noRecord}
              </strong>{' '}
              {t.access.saveCredentialsConfirmDescription}
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
              className={actionButtonStyles.successSolid}
              onClick={() => {
                void confirmSaveCredentials()
              }}
            >
              {selectedUser
                ? t.access.updateCredentials
                : t.access.saveCredentials}
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
              <strong>
                {userToDelete?.empleado?.nombreCompleto ??
                  userToDelete?.nombre ??
                  t.common.noRecord}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className={actionButtonStyles.dangerSolid}
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
