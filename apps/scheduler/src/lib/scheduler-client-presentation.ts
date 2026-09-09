export interface SchedulerClientHistoryEntry {
  id: string;
  branchId: string;
  date: string;
  displayName: string;
  bookingId?: string;
}

export interface SchedulerClient {
  id: string;
  fullName: string;
  aliases: string[];
  phone: string;
  normalizedPhone: string;
  email: string;
  alternateEmails: string[];
  lastName?: string;
  officialId?: string;
  gender?: "female" | "male" | "other" | "unspecified";
  birthDate?: string;
  createdAt?: string;
  clientNumber?: string;
  address?: string;
  district?: string;
  city?: string;
  representativeId?: string;
  sharedWithId?: string;
  phoneAdvisorId?: string;
  originBranchId?: string;
  facialistId?: string;
  history: SchedulerClientHistoryEntry[];
}

export const normalizeClientPhone = (value: string): string =>
  value.replace(/\D/g, "");

export const normalizeClientText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-MX");

export function findSchedulerClients(
  clients: SchedulerClient[],
  query: string,
): SchedulerClient[] {
  const normalizedText = normalizeClientText(query);
  const normalizedPhone = normalizeClientPhone(query);
  const hasLetters = /[a-záéíóúñü]/i.test(query);
  const hasNumbers = /\d/.test(query);

  if (
    (!hasLetters || normalizedText.length < 2) &&
    (!hasNumbers || normalizedPhone.length < 2)
  ) {
    return [];
  }

  return clients
    .map((client) => {
      const matchesName =
        hasLetters &&
        [client.fullName, ...client.aliases].some((name) =>
          normalizeClientText(name).includes(normalizedText),
        );
      const phoneIndex = hasNumbers
        ? client.normalizedPhone.indexOf(normalizedPhone)
        : -1;
      const matchesPhone = hasNumbers && phoneIndex >= 0;

      let rank = Number.POSITIVE_INFINITY;
      if (matchesName) {
        const normalizedName = normalizeClientText(client.fullName);
        rank = normalizedName.startsWith(normalizedText) ? 1 : 2;
      }
      if (matchesPhone) {
        const phoneRank =
          client.normalizedPhone === normalizedPhone
            ? 0
            : phoneIndex === 0
              ? 1
              : 2;
        rank = Math.min(rank, phoneRank);
      }
      return { client, rank };
    })
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 6)
    .map(({ client }) => client);
}
