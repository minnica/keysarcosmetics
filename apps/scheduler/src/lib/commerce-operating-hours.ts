export const commerceOperatingHoursStorageKey = 'scheduler-operating-hours-by-commerce'
export const commerceOperatingHoursChangeEvent = 'scheduler-operating-hours-change'
const commerceOperatingHoursStorageVersionKey = 'scheduler-operating-hours-version'
const commerceOperatingHoursStorageVersion = '2'

export const commerceScheduleDays = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const

export interface CommerceOperatingDay {
  day: string
  enabled: boolean
  open: string
  close: string
}

export interface CommerceOperatingHours {
  commerceId: string
  is24Hours: boolean
  schedule: CommerceOperatingDay[]
}

export interface CommerceDailyOperatingWindow {
  enabled: boolean
  is24Hours: boolean
  open: string
  close: string
  openMinutes: number
  closeMinutes: number
}

function timeToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export function createDefaultCommerceOperatingHours(
  commerceId: string,
): CommerceOperatingHours {
  return {
    commerceId,
    is24Hours: false,
    schedule: commerceScheduleDays.map((day, index) => ({
      day,
      enabled: index < 6,
      open: '09:00',
      close: '22:00',
    })),
  }
}

function normalizeCommerceOperatingHours(
  commerceId: string,
  value?: Partial<CommerceOperatingHours>,
): CommerceOperatingHours {
  const fallback = createDefaultCommerceOperatingHours(commerceId)
  const savedDays = new Map(value?.schedule?.map((day) => [day.day, day]))

  return {
    commerceId,
    is24Hours: value?.is24Hours === true,
    schedule: fallback.schedule.map((day) => ({
      ...day,
      ...savedDays.get(day.day),
      day: day.day,
    })),
  }
}

function isLegacyDefaultCommerceHours(value: Partial<CommerceOperatingHours>): boolean {
  if (value.is24Hours === true || value.schedule?.length !== commerceScheduleDays.length) {
    return false
  }

  return commerceScheduleDays.every((day, index) => {
    const savedDay = value.schedule?.find((candidate) => candidate.day === day)
    return (
      savedDay?.enabled === (index < 6) &&
      savedDay.open === '09:00' &&
      savedDay.close === '21:00'
    )
  })
}

function migrateStoredCommerceOperatingHours(
  saved: Record<string, Partial<CommerceOperatingHours>>,
): Record<string, Partial<CommerceOperatingHours>> {
  if (window.localStorage.getItem(commerceOperatingHoursStorageVersionKey) === commerceOperatingHoursStorageVersion) {
    return saved
  }

  let changed = false
  const migrated = Object.fromEntries(
    Object.entries(saved).map(([commerceId, config]) => {
      if (!isLegacyDefaultCommerceHours(config)) return [commerceId, config]

      changed = true
      return [
        commerceId,
        {
          ...config,
          schedule: config.schedule?.map((day) => ({ ...day, close: '22:00' })),
        },
      ]
    }),
  )

  if (changed) {
    window.localStorage.setItem(commerceOperatingHoursStorageKey, JSON.stringify(migrated))
  }
  window.localStorage.setItem(
    commerceOperatingHoursStorageVersionKey,
    commerceOperatingHoursStorageVersion,
  )

  return migrated
}

export function getCommerceOperatingHours(commerceId: string): CommerceOperatingHours {
  if (typeof window === 'undefined') return createDefaultCommerceOperatingHours(commerceId)

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(commerceOperatingHoursStorageKey) ?? '{}',
    ) as Record<string, Partial<CommerceOperatingHours>>
    const migrated = migrateStoredCommerceOperatingHours(saved)
    return normalizeCommerceOperatingHours(commerceId, migrated[commerceId])
  } catch {
    return createDefaultCommerceOperatingHours(commerceId)
  }
}

export function saveCommerceOperatingHours(config: CommerceOperatingHours): void {
  if (typeof window === 'undefined') return

  const current = JSON.parse(
    window.localStorage.getItem(commerceOperatingHoursStorageKey) ?? '{}',
  ) as Record<string, CommerceOperatingHours>
  window.localStorage.setItem(
    commerceOperatingHoursStorageKey,
    JSON.stringify({ ...current, [config.commerceId]: config }),
  )
  window.localStorage.setItem(
    commerceOperatingHoursStorageVersionKey,
    commerceOperatingHoursStorageVersion,
  )
  window.dispatchEvent(
    new CustomEvent(commerceOperatingHoursChangeEvent, {
      detail: { commerceId: config.commerceId },
    }),
  )
}

export function getCommerceDailyOperatingWindow(
  config: CommerceOperatingHours,
  date: Date,
): CommerceDailyOperatingWindow {
  if (config.is24Hours) {
    return {
      enabled: true,
      is24Hours: true,
      open: '00:00',
      close: '24:00',
      openMinutes: 0,
      closeMinutes: 24 * 60,
    }
  }

  const mondayFirstDayIndex = (date.getDay() + 6) % 7
  const day = config.schedule[mondayFirstDayIndex]
  if (!day?.enabled) {
    return {
      enabled: false,
      is24Hours: false,
      open: day?.open ?? '00:00',
      close: day?.close ?? '00:00',
      openMinutes: 0,
      closeMinutes: 0,
    }
  }

  return {
    enabled: true,
    is24Hours: false,
    open: day.open,
    close: day.close,
    openMinutes: timeToMinutes(day.open),
    closeMinutes: timeToMinutes(day.close),
  }
}

export function isOutsideCommerceOperatingHours(
  config: CommerceOperatingHours,
  date: Date,
  start: string,
  end: string,
): boolean {
  const window = getCommerceDailyOperatingWindow(config, date)
  if (!window.enabled) return true
  if (window.is24Hours) return false

  return timeToMinutes(start) < window.openMinutes || timeToMinutes(end) > window.closeMinutes
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function getCommerceCalendarRange(
  config: CommerceOperatingHours,
  dates: Date[],
  slotMinutes = 60,
): { startMinutes: number; endMinutes: number; slots: string[] } | null {
  const enabledWindows = dates
    .map((date) => getCommerceDailyOperatingWindow(config, date))
    .filter((window) => window.enabled)
  if (enabledWindows.length === 0) return null

  const startMinutes = Math.min(...enabledWindows.map((window) => window.openMinutes))
  const endMinutes = Math.max(...enabledWindows.map((window) => window.closeMinutes))
  const slots = Array.from(
    { length: Math.max(0, Math.ceil((endMinutes - startMinutes) / slotMinutes)) },
    (_, index) => minutesToTime(startMinutes + index * slotMinutes),
  )

  return { startMinutes, endMinutes, slots }
}
