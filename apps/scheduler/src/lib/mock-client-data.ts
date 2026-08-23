export interface SchedulerClientHistoryEntry {
  id: string
  branchId: string
  date: string
  displayName: string
  bookingId?: string
}

export interface SchedulerClient {
  id: string
  fullName: string
  aliases: string[]
  phone: string
  normalizedPhone: string
  email: string
  alternateEmails: string[]
  history: SchedulerClientHistoryEntry[]
}

export const normalizeClientPhone = (value: string): string =>
  value.replace(/\D/g, '')

export const normalizeClientText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-MX')

export const initialSchedulerClients: SchedulerClient[] = [
  {
    id: 'client-patricia-delgado',
    fullName: 'Patricia Delgado',
    aliases: [],
    phone: '+52 55 5100 0280',
    normalizedPhone: '525551000280',
    email: 'patricia@example.com',
    alternateEmails: [],
    history: [
      {
        id: 'history-patricia-first-visit',
        branchId: 'galerias-insurgentes',
        date: '2026-05-12',
        displayName: 'Patricia Delgado',
        bookingId: 'history-booking-patricia-layaway',
      },
      {
        id: 'history-patricia-insurgentes',
        branchId: 'galerias-insurgentes',
        date: '2026-06-30',
        displayName: 'Patricia Delgado',
        bookingId: 'booking-1',
      },
    ],
  },
  {
    id: 'client-maria-camila',
    fullName: 'María Camila Celis',
    aliases: ['Maria Camila Celis'],
    phone: '+52 55 3001 9044',
    normalizedPhone: '525530019044',
    email: 'maria.camila@example.com',
    alternateEmails: [],
    history: [
      {
        id: 'history-maria-mitikah',
        branchId: 'mitikah',
        date: '2026-06-30',
        displayName: 'Maria Camila Celis',
        bookingId: 'booking-7',
      },
    ],
  },
  {
    id: 'client-yumi-hirasawa',
    fullName: 'Yumi Hirasawa',
    aliases: [],
    phone: '+52 55 7712 3389',
    normalizedPhone: '525577123389',
    email: 'yumi@example.com',
    alternateEmails: [],
    history: [
      {
        id: 'history-yumi-insurgentes',
        branchId: 'galerias-insurgentes',
        date: '2026-06-30',
        displayName: 'Yumi Hirasawa',
        bookingId: 'booking-14',
      },
    ],
  },
  {
    id: 'client-adriana-acosta',
    fullName: 'Adriana Acosta',
    aliases: [],
    phone: '+52 55 7001 4477',
    normalizedPhone: '525570014477',
    email: 'adriana@example.com',
    alternateEmails: [],
    history: [
      {
        id: 'history-adriana-masaryk',
        branchId: 'masaryk',
        date: '2026-06-30',
        displayName: 'Adriana Acosta',
        bookingId: 'booking-8',
      },
    ],
  },
]

export function findSchedulerClients(
  clients: SchedulerClient[],
  query: string,
): SchedulerClient[] {
  const normalizedText = normalizeClientText(query)
  const normalizedPhone = normalizeClientPhone(query)
  const hasLetters = /[a-záéíóúñü]/i.test(query)
  const hasNumbers = /\d/.test(query)

  if (
    (!hasLetters || normalizedText.length < 2) &&
    (!hasNumbers || normalizedPhone.length < 2)
  ) {
    return []
  }

  return clients
    .map((client) => {
      const matchesName =
        hasLetters &&
        [client.fullName, ...client.aliases].some((name) =>
          normalizeClientText(name).includes(normalizedText),
        )
      const phoneIndex = hasNumbers
        ? client.normalizedPhone.indexOf(normalizedPhone)
        : -1
      const matchesPhone = hasNumbers && phoneIndex >= 0

      let rank = Number.POSITIVE_INFINITY
      if (matchesName) {
        const normalizedName = normalizeClientText(client.fullName)
        rank = normalizedName.startsWith(normalizedText) ? 1 : 2
      }
      if (matchesPhone) {
        const phoneRank =
          client.normalizedPhone === normalizedPhone
            ? 0
            : phoneIndex === 0
              ? 1
              : 2
        rank = Math.min(rank, phoneRank)
      }

      return { client, rank }
    })
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 6)
    .map(({ client }) => client)
}
