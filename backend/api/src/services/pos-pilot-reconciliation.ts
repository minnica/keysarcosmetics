import { Prisma } from "@prisma/client";

type PilotDatabase = Prisma.TransactionClient;

export interface PosPilotReconciliationOptions {
  branchId: string;
  businessDate: string;
  minimumTicketCount: number;
  requireClosedDay: boolean;
  requireCoverage: boolean;
  requireOfflineSync: boolean;
}

export interface PosPilotCheck {
  code: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface PosPilotReconciliationReport {
  generatedAt: string;
  mode: "READ_ONLY";
  status: "PASS" | "FAIL";
  scope: {
    branchId: string;
    businessDate: string;
  };
  readiness: {
    branchActive: boolean;
    profileActive: boolean;
    activeTerminals: number;
    activeCredentials: number;
    activeMasterCredentials: number;
    grantedPermissions: number;
  };
  coverage: {
    businessDayStatus: "OPEN" | "CLOSED" | "MISSING";
    tickets: number;
    layawayPayments: number;
    cancellationsOrReturns: number;
    inventoryMovements: number;
    memberships: number;
    membershipAttendances: number;
    agendaAppointments: number;
    installmentPayments: number;
    companyParticipants: number;
    offlineOperationsSynced: number;
  };
  totals: {
    ticketSales: string;
    ticketCollected: string;
    paymentOperationsNet: string;
    legacyProjectionNet: string;
    cashExpensesNet: string;
  };
  synchronization: {
    synced: number;
    pending: number;
    syncing: number;
    error: number;
    conflict: number;
  };
  checks: PosPilotCheck[];
  discrepancies: PosPilotCheck[];
}

const zero = () => new Prisma.Decimal(0);

const sum = (values: Prisma.Decimal[]) =>
  values.reduce((total, value) => total.plus(value), zero());

const businessDateOf = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

function jsonRecord(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function moneyFromJson(value: unknown): Prisma.Decimal | null {
  if (typeof value !== "string" || !/^-?(?:0|[1-9]\d*)\.\d{2}$/.test(value)) {
    return null;
  }
  return new Prisma.Decimal(value);
}

function countFromJson(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function validatePosPilotOptions(
  options: PosPilotReconciliationOptions,
): void {
  if (!options.branchId.trim())
    throw new Error("POS_PILOT_BRANCH_ID es obligatorio");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.businessDate)) {
    throw new Error("POS_PILOT_BUSINESS_DATE debe usar AAAA-MM-DD");
  }
  const parsedDate = new Date(`${options.businessDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== options.businessDate
  ) {
    throw new Error("POS_PILOT_BUSINESS_DATE no es una fecha válida");
  }
  if (
    !Number.isInteger(options.minimumTicketCount) ||
    options.minimumTicketCount < 0
  ) {
    throw new Error(
      "POS_PILOT_MIN_TICKETS debe ser un entero mayor o igual a cero",
    );
  }
}

export async function reconcilePosPilot(
  db: PilotDatabase,
  options: PosPilotReconciliationOptions,
): Promise<PosPilotReconciliationReport> {
  validatePosPilotOptions(options);
  const businessDate = new Date(`${options.businessDate}T00:00:00.000Z`);
  const eventWindowStart = new Date(
    businessDate.getTime() - 14 * 60 * 60 * 1000,
  );
  const eventWindowEnd = new Date(businessDate.getTime() + 38 * 60 * 60 * 1000);
  const checks: PosPilotCheck[] = [];
  const check = (
    code: string,
    passed: boolean,
    expected: string,
    actual: string,
  ) => checks.push({ code, passed, expected, actual });

  const [
    branch,
    activeCredentials,
    activeMasterCredentials,
    grantedPermissions,
    day,
    tickets,
    paymentOperations,
    cashMovements,
    inventoryMovements,
    eventsInWindow,
  ] = await Promise.all([
    db.sucursal.findUnique({
      where: { id: options.branchId },
      select: {
        activa: true,
        posProfile: { select: { activo: true } },
        posTerminals: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        inventoryLocations: {
          where: { type: "BRANCH", active: true },
          select: { id: true },
        },
      },
    }),
    db.posCredential.count({
      where: {
        active: true,
        OR: [
          { employee: { is: { activo: true } } },
          { user: { is: { activo: true } } },
        ],
      },
    }),
    db.posMasterCredential.count({
      where: {
        active: true,
        credential: {
          active: true,
          OR: [
            { employee: { is: { activo: true } } },
            { user: { is: { activo: true } } },
          ],
        },
      },
    }),
    db.positionPosPermission.count({
      where: {
        allowed: true,
        position: { activo: true },
        permissionNode: { active: true, grantable: true },
      },
    }),
    db.posBusinessDay.findUnique({
      where: {
        branchId_businessDate: {
          branchId: options.branchId,
          businessDate,
        },
      },
      select: { id: true, status: true, closeSummary: true },
    }),
    db.posTicket.findMany({
      where: { branchId: options.branchId, businessDate },
      select: {
        id: true,
        customerId: true,
        status: true,
        settlementStatus: true,
        total: true,
        amountPaid: true,
        pendingAmount: true,
        discountTotal: true,
        lines: { select: { kind: true, total: true } },
        sellers: { select: { shareAmount: true } },
        layaway: { select: { amountPaid: true, pendingAmount: true } },
        paymentOperations: {
          select: { kind: true, amount: true },
        },
        participants: {
          select: {
            kind: true,
            employeeId: true,
            companyId: true,
            shareAmount: true,
          },
        },
        clientMemberships: {
          select: {
            id: true,
            status: true,
            activatedAt: true,
            usedSessions: true,
            totalSessions: true,
            purchaseBranchId: true,
            attendance: {
              select: {
                branchId: true,
                appointmentId: true,
                corrections: { select: { sessionDelta: true } },
              },
            },
          },
        },
        appointments: {
          select: {
            id: true,
            status: true,
            ticketId: true,
            customerId: true,
            branchId: true,
            membershipId: true,
            externalAppointmentId: true,
            agendaReservationId: true,
          },
        },
      },
    }),
    db.posPaymentOperation.findMany({
      where: {
        businessDate,
        ticket: { branchId: options.branchId },
      },
      select: {
        id: true,
        kind: true,
        amount: true,
        payments: {
          select: {
            paymentMethodId: true,
            amount: true,
            installmentMonths: true,
          },
        },
        legacyProjections: {
          select: {
            employeeId: true,
            amount: true,
            venta: {
              select: {
                fecha: true,
                sucursalId: true,
                vendedorId: true,
                sesionId: true,
                detalles: {
                  select: { metodoPagoId: true, cantidad: true },
                },
              },
            },
          },
        },
      },
    }),
    db.posCashMovement.findMany({
      where: {
        businessDate,
        expense: { branchId: options.branchId },
      },
      select: { amount: true },
    }),
    db.inventoryMovement.findMany({
      where: {
        businessDate,
        lines: {
          some: {
            OR: [
              { fromLocation: { branchId: options.branchId } },
              { toLocation: { branchId: options.branchId } },
            ],
          },
        },
      },
      select: {
        status: true,
        reversedBy: { select: { id: true } },
        lines: {
          where: {
            OR: [
              { fromLocation: { branchId: options.branchId } },
              { toLocation: { branchId: options.branchId } },
            ],
          },
          select: {
            quantity: true,
            fromLocationId: true,
            toLocationId: true,
            fromQuantityBefore: true,
            fromQuantityAfter: true,
            toQuantityBefore: true,
            toQuantityAfter: true,
          },
        },
      },
    }),
    db.posTicketEvent.findMany({
      where: {
        ticket: { branchId: options.branchId },
        creadoEn: { gte: eventWindowStart, lt: eventWindowEnd },
      },
      select: { type: true, creadoEn: true },
    }),
  ]);

  check(
    "BRANCH_ACTIVE",
    branch?.activa === true,
    "active branch",
    branch ? String(branch.activa) : "missing",
  );
  check(
    "BRANCH_PROFILE_ACTIVE",
    branch?.posProfile?.activo === true,
    "active POS profile",
    branch?.posProfile ? String(branch.posProfile.activo) : "missing",
  );
  check(
    "BRANCH_INVENTORY_LOCATION",
    (branch?.inventoryLocations.length ?? 0) === 1,
    "1 active branch inventory location",
    String(branch?.inventoryLocations.length ?? 0),
  );
  check(
    "ACTIVE_TERMINAL",
    (branch?.posTerminals.length ?? 0) > 0,
    ">= 1",
    String(branch?.posTerminals.length ?? 0),
  );
  check(
    "ACTIVE_CREDENTIAL",
    activeCredentials > 0,
    ">= 1",
    String(activeCredentials),
  );
  check(
    "ACTIVE_MASTER_CREDENTIAL",
    activeMasterCredentials > 0,
    ">= 1",
    String(activeMasterCredentials),
  );
  check(
    "GRANTED_PERMISSIONS",
    grantedPermissions > 0,
    ">= 1",
    String(grantedPermissions),
  );
  check(
    "BUSINESS_DAY_EXISTS",
    Boolean(day),
    "existing business day",
    day?.status ?? "missing",
  );

  let ticketLineMismatches = 0;
  let sellerShareMismatches = 0;
  let ticketSettlementMismatches = 0;
  for (const ticket of tickets) {
    const lineTotal = sum(
      ticket.lines
        .filter((line) => line.kind === "SALE")
        .map((line) => line.total),
    );
    if (!lineTotal.equals(ticket.total)) ticketLineMismatches += 1;
    if (
      !sum(ticket.sellers.map((seller) => seller.shareAmount)).equals(
        ticket.total,
      )
    ) {
      sellerShareMismatches += 1;
    }
    const nonRefundPayments = sum(
      ticket.paymentOperations
        .filter((operation) => operation.kind !== "REFUND")
        .map((operation) => operation.amount),
    );
    const layawayMatches = ticket.layaway
      ? ticket.layaway.amountPaid.equals(ticket.amountPaid) &&
        ticket.layaway.pendingAmount.equals(ticket.pendingAmount)
      : ticket.pendingAmount.equals(0);
    const statusMatches =
      ticket.status === "CANCELED" || ticket.status === "REFUNDED"
        ? true
        : ticket.pendingAmount.equals(0)
          ? ticket.status === "COMPLETED" && ticket.settlementStatus === "PAID"
          : ticket.status === "LAYAWAY" &&
            ["LAYAWAY", "PENDING"].includes(ticket.settlementStatus);
    if (
      !ticket.total.minus(ticket.amountPaid).equals(ticket.pendingAmount) ||
      !nonRefundPayments.equals(ticket.amountPaid) ||
      !layawayMatches ||
      !statusMatches
    ) {
      ticketSettlementMismatches += 1;
    }
  }
  check(
    "TICKET_LINES_RECONCILED",
    ticketLineMismatches === 0,
    "0 mismatches",
    String(ticketLineMismatches),
  );
  check(
    "SELLER_SHARES_RECONCILED",
    sellerShareMismatches === 0,
    "0 mismatches",
    String(sellerShareMismatches),
  );
  check(
    "TICKET_SETTLEMENT_RECONCILED",
    ticketSettlementMismatches === 0,
    "0 mismatches",
    String(ticketSettlementMismatches),
  );

  let participantMismatches = 0;
  let membershipMismatches = 0;
  let agendaMembershipMismatches = 0;
  for (const ticket of tickets) {
    const participantTotal = sum(
      ticket.participants.map((participant) => participant.shareAmount),
    );
    if (
      ticket.participants.length === 0 ||
      !participantTotal.equals(ticket.total) ||
      ticket.participants.some((participant) =>
        participant.kind === "SELLER"
          ? !participant.employeeId || Boolean(participant.companyId)
          : !participant.companyId || Boolean(participant.employeeId),
      )
    ) {
      participantMismatches += 1;
    }
    for (const membership of ticket.clientMemberships) {
      const correctedAttendanceCount = membership.attendance.reduce(
        (total, attendance) =>
          total +
          1 +
          attendance.corrections.reduce(
            (delta, correction) => delta + correction.sessionDelta,
            0,
          ),
        0,
      );
      const paid = ticket.pendingAmount.equals(0);
      const canceled = ["CANCELED", "REFUNDED"].includes(ticket.status);
      const statusMatches = canceled
        ? membership.status === "CANCELED"
        : paid
          ? membership.usedSessions >= membership.totalSessions
            ? membership.status === "EXHAUSTED"
            : membership.status === "ACTIVE"
          : membership.status === "PENDING";
      if (
        membership.purchaseBranchId !== options.branchId ||
        membership.usedSessions !== correctedAttendanceCount ||
        !statusMatches ||
        (!canceled &&
          (paid ? !membership.activatedAt : Boolean(membership.activatedAt))) ||
        membership.attendance.some(
          (attendance) => attendance.branchId !== options.branchId,
        )
      ) {
        membershipMismatches += 1;
      }
    }
    for (const appointment of ticket.appointments) {
      if (
        appointment.ticketId !== ticket.id ||
        appointment.customerId !== ticket.customerId ||
        appointment.branchId !== options.branchId ||
        (appointment.membershipId &&
          !ticket.clientMemberships.some(
            (membership) => membership.id === appointment.membershipId,
          )) ||
        (["SCHEDULED", "ATTENDED"].includes(appointment.status) &&
          (!appointment.externalAppointmentId ||
            !appointment.agendaReservationId))
      ) {
        agendaMembershipMismatches += 1;
      }
    }
  }
  check(
    "COMMERCIAL_PARTICIPANTS_RECONCILED",
    participantMismatches === 0,
    "0 mismatches",
    String(participantMismatches),
  );
  check(
    "MEMBERSHIP_ACTIVATION_AND_CONSUMPTION_RECONCILED",
    membershipMismatches === 0,
    "0 mismatches",
    String(membershipMismatches),
  );
  check(
    "AGENDA_MEMBERSHIP_LINKS_RECONCILED",
    agendaMembershipMismatches === 0,
    "0 mismatches",
    String(agendaMembershipMismatches),
  );

  let operationPaymentMismatches = 0;
  let operationProjectionMismatches = 0;
  let legacySaleMismatches = 0;
  let paymentMethodProjectionMismatches = 0;
  for (const operation of paymentOperations) {
    const paymentTotal = sum(
      operation.payments.map((payment) => payment.amount),
    );
    if (!paymentTotal.equals(operation.amount)) operationPaymentMismatches += 1;
    const expectedProjection =
      operation.kind === "REFUND"
        ? operation.amount.negated()
        : operation.amount;
    if (
      !sum(
        operation.legacyProjections.map((projection) => projection.amount),
      ).equals(expectedProjection)
    ) {
      operationProjectionMismatches += 1;
    }
    const paymentByMethod = new Map<string, Prisma.Decimal>();
    const projectedByMethod = new Map<string, Prisma.Decimal>();
    for (const payment of operation.payments) {
      paymentByMethod.set(
        payment.paymentMethodId,
        (paymentByMethod.get(payment.paymentMethodId) ?? zero()).plus(
          payment.amount,
        ),
      );
    }
    for (const projection of operation.legacyProjections) {
      const detailTotal = sum(
        projection.venta.detalles.map((detail) => detail.cantidad),
      );
      if (
        !detailTotal.equals(projection.amount) ||
        projection.venta.sucursalId !== options.branchId ||
        projection.venta.vendedorId !== projection.employeeId ||
        projection.venta.sesionId !== operation.id ||
        projection.venta.fecha.toISOString().slice(0, 10) !==
          options.businessDate
      ) {
        legacySaleMismatches += 1;
      }
      for (const detail of projection.venta.detalles) {
        projectedByMethod.set(
          detail.metodoPagoId,
          (projectedByMethod.get(detail.metodoPagoId) ?? zero()).plus(
            detail.cantidad,
          ),
        );
      }
    }
    const methodIds = new Set([
      ...paymentByMethod.keys(),
      ...projectedByMethod.keys(),
    ]);
    if (
      [...methodIds].some((methodId) => {
        const expected =
          operation.kind === "REFUND"
            ? (paymentByMethod.get(methodId) ?? zero()).negated()
            : (paymentByMethod.get(methodId) ?? zero());
        return !expected.equals(projectedByMethod.get(methodId) ?? zero());
      })
    ) {
      paymentMethodProjectionMismatches += 1;
    }
  }
  check(
    "PAYMENT_OPERATIONS_RECONCILED",
    operationPaymentMismatches === 0,
    "0 mismatches",
    String(operationPaymentMismatches),
  );
  check(
    "LEGACY_PROJECTIONS_RECONCILED",
    operationProjectionMismatches === 0,
    "0 mismatches",
    String(operationProjectionMismatches),
  );
  check(
    "LEGACY_SALES_RECONCILED",
    legacySaleMismatches === 0,
    "0 mismatches",
    String(legacySaleMismatches),
  );
  check(
    "PAYMENT_METHODS_RECONCILED",
    paymentMethodProjectionMismatches === 0,
    "0 mismatches",
    String(paymentMethodProjectionMismatches),
  );

  let inventoryLineMismatches = 0;
  let inventoryStatusMismatches = 0;
  for (const movement of inventoryMovements) {
    if (
      (movement.status === "REVERSED" && !movement.reversedBy) ||
      (movement.status === "APPLIED" && movement.reversedBy)
    ) {
      inventoryStatusMismatches += 1;
    }
    for (const line of movement.lines) {
      const sourceMatches = line.fromLocationId
        ? Boolean(
            line.fromQuantityBefore &&
            line.fromQuantityAfter &&
            line.fromQuantityBefore
              .minus(line.quantity)
              .equals(line.fromQuantityAfter),
          )
        : line.fromQuantityBefore === null && line.fromQuantityAfter === null;
      const destinationMatches = line.toLocationId
        ? Boolean(
            line.toQuantityBefore &&
            line.toQuantityAfter &&
            line.toQuantityBefore
              .plus(line.quantity)
              .equals(line.toQuantityAfter),
          )
        : line.toQuantityBefore === null && line.toQuantityAfter === null;
      if (
        !line.quantity.greaterThan(0) ||
        (!line.fromLocationId && !line.toLocationId) ||
        line.fromLocationId === line.toLocationId ||
        !sourceMatches ||
        !destinationMatches
      ) {
        inventoryLineMismatches += 1;
      }
    }
  }
  check(
    "INVENTORY_LEDGER_RECONCILED",
    inventoryLineMismatches === 0,
    "0 mismatches",
    String(inventoryLineMismatches),
  );
  check(
    "INVENTORY_REVERSALS_RECONCILED",
    inventoryStatusMismatches === 0,
    "0 status mismatches",
    String(inventoryStatusMismatches),
  );

  const terminalIds = branch?.posTerminals.map((terminal) => terminal.id) ?? [];
  const syncOperations = terminalIds.length
    ? await db.posSyncOperation.findMany({
        where: { terminalId: { in: terminalIds } },
        select: {
          clientOperationId: true,
          terminalId: true,
          terminalSequence: true,
          dependencyIds: true,
          status: true,
          creadoEn: true,
        },
        orderBy: [{ terminalId: "asc" }, { terminalSequence: "asc" }],
      })
    : [];
  const cursors = terminalIds.length
    ? await db.posSyncCursor.findMany({
        where: { terminalId: { in: terminalIds } },
        select: { terminalId: true, lastSequence: true },
      })
    : [];
  const pilotSyncOperations = syncOperations.filter(
    (operation) => businessDateOf(operation.creadoEn) === options.businessDate,
  );
  const synchronization = {
    synced: pilotSyncOperations.filter(
      (operation) => operation.status === "SYNCED",
    ).length,
    pending: pilotSyncOperations.filter(
      (operation) => operation.status === "PENDING",
    ).length,
    syncing: pilotSyncOperations.filter(
      (operation) => operation.status === "SYNCING",
    ).length,
    error: pilotSyncOperations.filter(
      (operation) => operation.status === "ERROR",
    ).length,
    conflict: pilotSyncOperations.filter(
      (operation) => operation.status === "CONFLICT",
    ).length,
  };
  let syncSequenceMismatches = 0;
  let syncDependencyMismatches = 0;
  const syncByClientId = new Map(
    syncOperations.map((operation) => [operation.clientOperationId, operation]),
  );
  for (const terminalId of terminalIds) {
    const terminalOperations = syncOperations.filter(
      (operation) => operation.terminalId === terminalId,
    );
    const cursor = cursors.find(
      (candidate) => candidate.terminalId === terminalId,
    );
    for (let index = 0; index < terminalOperations.length; index += 1) {
      if (terminalOperations[index]!.terminalSequence !== BigInt(index + 1)) {
        syncSequenceMismatches += 1;
        break;
      }
    }
    const lastResolved = [...terminalOperations]
      .reverse()
      .find((operation) => ["SYNCED", "CONFLICT"].includes(operation.status));
    if (
      (cursor?.lastSequence ?? 0n) !== (lastResolved?.terminalSequence ?? 0n)
    ) {
      syncSequenceMismatches += 1;
    }
    for (const operation of terminalOperations) {
      const dependencyIds = Array.isArray(operation.dependencyIds)
        ? operation.dependencyIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      if (
        dependencyIds.some((dependencyId) => {
          const dependency = syncByClientId.get(dependencyId);
          return (
            !dependency ||
            dependency.terminalId !== operation.terminalId ||
            dependency.terminalSequence >= operation.terminalSequence ||
            dependency.status !== "SYNCED"
          );
        })
      ) {
        syncDependencyMismatches += 1;
      }
    }
  }
  const unresolvedSync =
    synchronization.pending +
    synchronization.syncing +
    synchronization.error +
    synchronization.conflict;
  check(
    "OFFLINE_SYNC_RESOLVED",
    unresolvedSync === 0,
    "0 unresolved operations",
    String(unresolvedSync),
  );
  check(
    "REPORT_SOURCES_HAVE_NO_PENDING_OFFLINE_DATA",
    unresolvedSync === 0,
    "0 operations excluded from canonical reports",
    String(unresolvedSync),
  );
  check(
    "OFFLINE_SEQUENCE_CONTIGUOUS",
    syncSequenceMismatches === 0,
    "0 sequence mismatches",
    String(syncSequenceMismatches),
  );
  check(
    "OFFLINE_DEPENDENCIES_RECONCILED",
    syncDependencyMismatches === 0,
    "0 dependency mismatches",
    String(syncDependencyMismatches),
  );

  const ticketIds = tickets.map((ticket) => ticket.id);
  const ticketNotificationCount = ticketIds.length
    ? await db.posNotification.count({
        where: {
          kind: "SALE_COMPLETED",
          sourceType: "PosTicket",
          sourceId: { in: ticketIds },
        },
      })
    : 0;
  check(
    "SALE_NOTIFICATIONS_COMMITTED",
    ticketNotificationCount === tickets.length,
    String(tickets.length),
    String(ticketNotificationCount),
  );

  if (day?.status === "CLOSED") {
    const summary = jsonRecord(day.closeSummary);
    const closedTickets = tickets.filter((ticket) =>
      ["COMPLETED", "LAYAWAY"].includes(ticket.status),
    );
    const expectedSummary = {
      ticketCount: closedTickets.length,
      salesTotal: sum(closedTickets.map((ticket) => ticket.total)),
      collectedTotal: sum(closedTickets.map((ticket) => ticket.amountPaid)),
      discountTotal: sum(closedTickets.map((ticket) => ticket.discountTotal)),
      expenseTotal: sum(cashMovements.map((movement) => movement.amount)),
    };
    const summaryMatches = Boolean(
      summary &&
      countFromJson(summary["ticketCount"]) === expectedSummary.ticketCount &&
      moneyFromJson(summary["salesTotal"])?.equals(
        expectedSummary.salesTotal,
      ) &&
      moneyFromJson(summary["collectedTotal"])?.equals(
        expectedSummary.collectedTotal,
      ) &&
      moneyFromJson(summary["discountTotal"])?.equals(
        expectedSummary.discountTotal,
      ) &&
      moneyFromJson(summary["expenseTotal"])?.equals(
        expectedSummary.expenseTotal,
      ) &&
      moneyFromJson(summary["netCashFlow"])?.equals(
        expectedSummary.collectedTotal.minus(expectedSummary.expenseTotal),
      ),
    );
    check(
      "CLOSE_SUMMARY_RECONCILED",
      summaryMatches,
      "summary equals canonical records",
      summaryMatches ? "reconciled" : "mismatch",
    );
  } else if (options.requireClosedDay) {
    check(
      "CLOSE_SUMMARY_RECONCILED",
      false,
      "closed day with summary",
      day?.status ?? "missing",
    );
  }

  const pilotEvents = eventsInWindow.filter(
    (event) => businessDateOf(event.creadoEn) === options.businessDate,
  );
  const cancellationsOrReturns = pilotEvents.filter((event) =>
    ["CANCELLATION", "RETURN"].includes(event.type),
  ).length;
  const layawayPayments = paymentOperations.filter(
    (operation) => operation.kind === "LAYAWAY_PAYMENT",
  ).length;
  const memberships = tickets.flatMap((ticket) => ticket.clientMemberships);
  const membershipAttendances = memberships.reduce(
    (total, membership) => total + membership.attendance.length,
    0,
  );
  const agendaAppointments = tickets.reduce(
    (total, ticket) => total + ticket.appointments.length,
    0,
  );
  const installmentPayments = paymentOperations.reduce(
    (total, operation) =>
      total +
      operation.payments.filter(
        (payment) => (payment.installmentMonths ?? 0) > 0,
      ).length,
    0,
  );
  const companyParticipants = tickets.reduce(
    (total, ticket) =>
      total +
      ticket.participants.filter(
        (participant) => participant.kind === "COMPANY",
      ).length,
    0,
  );
  if (options.requireClosedDay) {
    check(
      "PILOT_DAY_CLOSED",
      day?.status === "CLOSED",
      "CLOSED",
      day?.status ?? "missing",
    );
  }
  check(
    "PILOT_MINIMUM_TICKETS",
    tickets.length >= options.minimumTicketCount,
    `>= ${options.minimumTicketCount}`,
    String(tickets.length),
  );
  if (options.requireCoverage) {
    check(
      "PILOT_LAYAWAY_COVERAGE",
      layawayPayments > 0,
      ">= 1 layaway payment",
      String(layawayPayments),
    );
    check(
      "PILOT_CANCELLATION_COVERAGE",
      cancellationsOrReturns > 0,
      ">= 1 cancellation or return",
      String(cancellationsOrReturns),
    );
    check(
      "PILOT_INVENTORY_COVERAGE",
      inventoryMovements.length > 0,
      ">= 1 inventory movement",
      String(inventoryMovements.length),
    );
    check(
      "PILOT_MEMBERSHIP_COVERAGE",
      memberships.length > 0 && membershipAttendances > 0,
      ">= 1 membership and attendance",
      `${memberships.length}/${membershipAttendances}`,
    );
    check(
      "PILOT_AGENDA_COVERAGE",
      agendaAppointments > 0,
      ">= 1 Agenda appointment",
      String(agendaAppointments),
    );
    check(
      "PILOT_INSTALLMENT_COVERAGE",
      installmentPayments > 0,
      ">= 1 installment payment",
      String(installmentPayments),
    );
    check(
      "PILOT_COMPANY_PARTICIPANT_COVERAGE",
      companyParticipants > 0,
      ">= 1 company participant",
      String(companyParticipants),
    );
  }
  if (options.requireOfflineSync) {
    check(
      "PILOT_OFFLINE_RECOVERY_COVERAGE",
      synchronization.synced > 0,
      ">= 1 synced offline operation",
      String(synchronization.synced),
    );
  }

  const ticketSales = sum(tickets.map((ticket) => ticket.total));
  const ticketCollected = sum(tickets.map((ticket) => ticket.amountPaid));
  const paymentOperationsNet = sum(
    paymentOperations.map((operation) =>
      operation.kind === "REFUND"
        ? operation.amount.negated()
        : operation.amount,
    ),
  );
  const legacyProjectionNet = sum(
    paymentOperations.flatMap((operation) =>
      operation.legacyProjections.map((projection) => projection.amount),
    ),
  );
  const cashExpensesNet = sum(cashMovements.map((movement) => movement.amount));
  const discrepancies = checks.filter((candidate) => !candidate.passed);

  return {
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY",
    status: discrepancies.length === 0 ? "PASS" : "FAIL",
    scope: { branchId: options.branchId, businessDate: options.businessDate },
    readiness: {
      branchActive: branch?.activa ?? false,
      profileActive: branch?.posProfile?.activo ?? false,
      activeTerminals: branch?.posTerminals.length ?? 0,
      activeCredentials,
      activeMasterCredentials,
      grantedPermissions,
    },
    coverage: {
      businessDayStatus: day?.status ?? "MISSING",
      tickets: tickets.length,
      layawayPayments,
      cancellationsOrReturns,
      inventoryMovements: inventoryMovements.length,
      memberships: memberships.length,
      membershipAttendances,
      agendaAppointments,
      installmentPayments,
      companyParticipants,
      offlineOperationsSynced: synchronization.synced,
    },
    totals: {
      ticketSales: ticketSales.toFixed(2),
      ticketCollected: ticketCollected.toFixed(2),
      paymentOperationsNet: paymentOperationsNet.toFixed(2),
      legacyProjectionNet: legacyProjectionNet.toFixed(2),
      cashExpensesNet: cashExpensesNet.toFixed(2),
    },
    synchronization,
    checks,
    discrepancies,
  };
}
