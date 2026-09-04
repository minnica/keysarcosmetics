import {
  Prisma,
  type PosNotificationAccess,
  type PosNotificationKind,
} from "@prisma/client";

type Transaction = Prisma.TransactionClient;

export const POS_NOTIFICATION_KINDS: readonly PosNotificationKind[] = [
  "SALE_COMPLETED",
  "CASH_EXPENSE",
  "PRODUCT_CREATED",
  "INVENTORY_ADD",
  "INVENTORY_REMOVE",
  "INVENTORY_TRANSFER",
  "CLOSE_DAY",
  "CLOCK_IN",
  "WAREHOUSE_REQUESTED",
  "WAREHOUSE_CREATION_APPROVED",
  "WAREHOUSE_SHIPPED",
  "WAREHOUSE_RECEIVED",
  "WAREHOUSE_RETURNED",
  "WAREHOUSE_CANCELED",
];

export interface PosNotificationInput {
  kind: PosNotificationKind;
  title: string;
  message: string;
  branchId?: string | null;
  audiencePermission?: string | null;
  warehouseRequestId?: string | null;
  createdByCredentialId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
}

/**
 * Confirma la notificación y sus destinatarios en la misma transacción que el
 * evento operativo. Si todavía no existen preferencias para el tipo, se
 * conserva el alcance legacy por permiso para no perder alertas durante el
 * despliegue gradual.
 */
export async function enqueuePosNotification(
  tx: Transaction,
  input: PosNotificationInput,
) {
  if (input.sourceType && input.sourceId) {
    const existing = await tx.posNotification.findFirst({
      where: {
        kind: input.kind,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });
    if (existing) return existing;
  }
  const preferences = await tx.posNotificationPreference.findMany({
    where: { kind: input.kind, active: true, credential: { active: true } },
    select: { credentialId: true, access: true },
  });
  return tx.posNotification.create({
    data: {
      kind: input.kind,
      title: input.title,
      message: input.message,
      branchId: input.branchId ?? null,
      audiencePermission: input.audiencePermission ?? null,
      warehouseRequestId: input.warehouseRequestId ?? null,
      createdByCredentialId: input.createdByCredentialId ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      ...(preferences.length > 0
        ? {
            outbox: {
              create: preferences.map((preference) => ({
                credentialId: preference.credentialId,
                access: preference.access,
              })),
            },
          }
        : {}),
    },
  });
}

export interface PosNotificationPreferenceWrite {
  kind: PosNotificationKind;
  recipients: Array<{ actorId: string; access: PosNotificationAccess }>;
}
