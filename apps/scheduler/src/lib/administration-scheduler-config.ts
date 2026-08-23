import {
  initialLocals,
  initialCommerces,
  initialProfessionals,
  type CommerceRecord,
  type LocalRecord,
  type ProfessionalRecord,
} from '@/lib/mock-administration-data'
import {
  schedulerAttendingSpecialists,
  schedulerBranches,
  schedulerProfessionals,
  type AttendingSpecialist,
  type BranchOption,
  type Professional,
} from '@/lib/mock-scheduler-data'

export const administrationSchedulerConfigStorageKey =
  'scheduler-administration-configuration'
export const administrationSchedulerConfigChangeEvent =
  'scheduler-administration-configuration-change'

export interface AdministrationSchedulerConfig {
  commerces: CommerceRecord[]
  locals: LocalRecord[]
  professionals: ProfessionalRecord[]
}

function cloneSchedule(schedule: LocalRecord['schedule']): LocalRecord['schedule'] {
  return schedule.map((day) => ({
    ...day,
    ...(day.breaks ? { breaks: day.breaks.map((item) => ({ ...item })) } : {}),
  }))
}

function cloneLocal(local: LocalRecord): LocalRecord {
  return {
    ...local,
    schedule: cloneSchedule(local.schedule),
    specialDays: local.specialDays.map((day) => ({ ...day })),
  }
}

function cloneCommerce(commerce: CommerceRecord): CommerceRecord {
  return {
    ...commerce,
    schedule: cloneSchedule(commerce.schedule),
  }
}

function cloneProfessional(professional: ProfessionalRecord): ProfessionalRecord {
  return {
    ...professional,
    commerceIds: [...professional.commerceIds],
    localIds: [...professional.localIds],
    services: [...professional.services],
    schedule: cloneSchedule(professional.schedule),
    specialDays: professional.specialDays.map((day) => ({ ...day })),
  }
}

export function createDefaultAdministrationSchedulerConfig(): AdministrationSchedulerConfig {
  return {
    commerces: initialCommerces.map(cloneCommerce),
    locals: initialLocals.map(cloneLocal),
    professionals: initialProfessionals.map(cloneProfessional),
  }
}

export function getAdministrationSchedulerConfig(): AdministrationSchedulerConfig {
  const fallback = createDefaultAdministrationSchedulerConfig()
  if (typeof window === 'undefined') return fallback

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(administrationSchedulerConfigStorageKey) ?? 'null',
    ) as Partial<AdministrationSchedulerConfig> | null
    return {
      commerces: Array.isArray(saved?.commerces)
        ? saved.commerces.map(cloneCommerce)
        : fallback.commerces,
      locals: Array.isArray(saved?.locals) ? saved.locals.map(cloneLocal) : fallback.locals,
      professionals: Array.isArray(saved?.professionals)
        ? saved.professionals.map(cloneProfessional)
        : fallback.professionals,
    }
  } catch {
    return fallback
  }
}

export function getConfiguredSchedulerCommerces(
  config: AdministrationSchedulerConfig,
): Array<{ id: string; name: string }> {
  return config.commerces
    .filter((commerce) => commerce.status === 'active')
    .map(({ id, name }) => ({ id, name }))
}

export function saveAdministrationSchedulerConfig(
  config: AdministrationSchedulerConfig,
): void {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(administrationSchedulerConfigStorageKey, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent(administrationSchedulerConfigChangeEvent))
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^a-z0-9]+/g, '')
}

function findStaticBranch(local: LocalRecord): BranchOption | undefined {
  const localName = normalizeName(local.name)
  return schedulerBranches.find((branch) => {
    if (branch.commerceId !== local.commerceId) return false
    const branchName = normalizeName(branch.name)
    return (
      localName === branchName ||
      localName.endsWith(branchName) ||
      branchName.endsWith(localName)
    )
  })
}

function getLocalBranchIdMap(locals: LocalRecord[]): Map<string, string> {
  return new Map(
    locals.map((local) => [local.id, findStaticBranch(local)?.id ?? local.id]),
  )
}

export function getConfiguredSchedulerBranches(
  config: AdministrationSchedulerConfig,
): BranchOption[] {
  const matchingLocalByBranchId = new Map<string, LocalRecord>()
  config.locals.forEach((local) => {
    const staticBranch = findStaticBranch(local)
    if (staticBranch) matchingLocalByBranchId.set(staticBranch.id, local)
  })

  const configuredStaticBranches = schedulerBranches.flatMap((branch) => {
    const local = matchingLocalByBranchId.get(branch.id)
    if (local?.status === 'inactive') return []
    return [{ ...branch, ...(local ? { name: local.name } : {}) }]
  })
  const customBranches = config.locals
    .filter((local) => local.status === 'active' && !findStaticBranch(local))
    .map((local): BranchOption => ({
      id: local.id,
      commerceId: local.commerceId,
      name: local.name,
    }))

  return [...configuredStaticBranches, ...customBranches]
}

function getProfessionalBranchIds(
  professional: ProfessionalRecord,
  localBranchIds: Map<string, string>,
): string[] {
  const ids = professional.localIds
    .map((localId) => localBranchIds.get(localId))
    .filter((branchId): branchId is string => Boolean(branchId))
  return [...new Set(ids)]
}

function getShortName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const professionalAccentPalette = [
  '#8bb09b',
  '#b6a6ca',
  '#d1a964',
  '#8fc8de',
  '#f4978e',
]

export function getConfiguredSchedulerProfessionals(
  config: AdministrationSchedulerConfig,
): Professional[] {
  const localBranchIds = getLocalBranchIdMap(config.locals)
  const adminByName = new Map(
    config.professionals.map((professional) => [normalizeName(professional.name), professional]),
  )
  const matchedAdminIds = new Set<string>()

  const configuredStaticProfessionals = schedulerProfessionals.flatMap((professional) => {
    const configured = adminByName.get(normalizeName(professional.name))
    if (!configured) return [professional]
    matchedAdminIds.add(configured.id)
    if (configured.status === 'inactive') return []
    const branchIds = getProfessionalBranchIds(configured, localBranchIds)
    return [{
      ...professional,
      name: configured.name.toLocaleUpperCase('es-MX'),
      shortName: getShortName(configured.name),
      commerceIds: [...configured.commerceIds],
      branchIds: branchIds.length > 0 ? branchIds : professional.branchIds,
      avatar: configured.avatar ?? professional.avatar,
    }]
  })

  const customProfessionals = config.professionals
    .filter(
      (professional) =>
        professional.status === 'active' && !matchedAdminIds.has(professional.id),
    )
    .map((professional, index): Professional => ({
      id: professional.id,
      commerceIds: [...professional.commerceIds],
      branchIds: getProfessionalBranchIds(professional, localBranchIds),
      name: professional.name.toLocaleUpperCase('es-MX'),
      shortName: getShortName(professional.name),
      avatar: professional.avatar ?? '',
      accent: professionalAccentPalette[index % professionalAccentPalette.length] ?? '#8bb09b',
    }))

  return [...configuredStaticProfessionals, ...customProfessionals]
}

export function getConfiguredAttendingSpecialists(
  config: AdministrationSchedulerConfig,
): AttendingSpecialist[] {
  const localBranchIds = getLocalBranchIdMap(config.locals)
  const adminByName = new Map(
    config.professionals.map((professional) => [normalizeName(professional.name), professional]),
  )
  const matchedAdminIds = new Set<string>()
  const configuredStatic = schedulerAttendingSpecialists.flatMap((specialist) => {
    const configured = adminByName.get(normalizeName(specialist.name))
    if (!configured) return [specialist]
    matchedAdminIds.add(configured.id)
    if (configured.status === 'inactive') return []
    return [{
      ...specialist,
      name: configured.name,
      branchIds: getProfessionalBranchIds(configured, localBranchIds),
    }]
  })
  const custom = config.professionals
    .filter(
      (professional) =>
        professional.status === 'active' && !matchedAdminIds.has(professional.id),
    )
    .map((professional): AttendingSpecialist => ({
      id: `attending-${professional.id}`,
      name: professional.name,
      branchIds: getProfessionalBranchIds(professional, localBranchIds),
    }))
  return [...configuredStatic, ...custom]
}
