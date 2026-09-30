import type {
  SchedulerAppointmentCreateDto,
  SchedulerAppointmentDto,
  SchedulerAppointmentStatus,
  SchedulerCustomerWriteDto,
  SchedulerCustomerFieldDefinitionWriteDto,
  SchedulerSettingSection,
  SchedulerSettingScope,
  SchedulerAvailabilitySlotDto,
} from "@cosmetics/types";
import {
  SCHEDULER_APPOINTMENT_STATUSES,
  SCHEDULER_SETTING_SECTIONS,
} from "@cosmetics/types";
import {
  buildDesignAppointment,
  designAccountForControls,
  designBootstrap,
  designDemoAccounts,
  designId,
  designInstant,
  designSessionToken,
  type DesignRow,
  type DesignState,
} from "./store";
import type {
  DesignAppointmentAnswer,
  DesignAppointmentCabinVisit,
  DesignCabinSalesReport,
  DesignCabinSalesReportBreakdown,
  DesignCabinSalesReportFilters,
  DesignCabinSalesReportRow,
  DesignCustomerAdvancedFilters,
  DesignCustomerAdvancedPage,
  DesignMovementRecord,
  DesignOperationAgent,
  DesignOperationPurpose,
  DesignPurchaseKind,
  DesignStatusDefinition,
  DesignStatusDefinitionRevision,
} from "./contracts";
import {
  schedulerReportRv7Fixture,
  schedulerReportKeys,
  type SchedulerReportKey,
} from "./fixtures/reports";

export class DesignApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "DESIGN_ERROR",
  ) {
    super(message);
  }
}
export interface DesignRequest {
  method: string;
  url: URL;
  body: DesignRow;
  headers: Headers;
}
export interface DesignReply {
  status: number;
  body: { success: boolean; data?: unknown; message?: string; code?: string };
}
const fail = (status: number, message: string, code?: string): never => {
  throw new DesignApiError(status, message, code);
};
const phoneKey = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const textKey = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const rows = (value: unknown): DesignRow[] =>
  Array.isArray(value) ? (value as DesignRow[]) : [];
const record = (value: unknown): DesignRow =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as DesignRow)
    : {};
const intervalsOverlap = (
  from: string,
  to: string,
  otherFrom: string,
  otherTo: string,
) => from < otherTo && to > otherFrom;
const isWriting = (method: string) =>
  !["GET", "HEAD", "OPTIONS"].includes(method);

function versionGuard(
  item: { version?: number; currentVersion?: number },
  body: DesignRow,
) {
  if (
    body.expectedVersion !== undefined &&
    body.expectedVersion !== (item.version ?? item.currentVersion)
  ) {
    fail(
      409,
      "El registro cambió. Recarga antes de guardar.",
      "VERSION_CONFLICT",
    );
  }
}
function page<T>(items: T[], query: URLSearchParams) {
  const current = Math.max(1, Number(query.get("page") ?? 1));
  const size = Math.max(1, Math.min(100, Number(query.get("pageSize") ?? 25)));
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    pageSize: size,
    total: items.length,
  };
}
function inScope(state: DesignState, branchId: string) {
  if (!designBootstrap(state).authorizedBranchIds.includes(branchId))
    fail(403, "Sucursal fuera del alcance de la sesión demo.");
}
function visibleAppointments(state: DesignState) {
  const bootstrap = designBootstrap(state);
  const professional = state.catalog.professionals[0]!.id;
  return state.appointments.filter(
    (appointment) =>
      bootstrap.authorizedBranchIds.includes(appointment.branchId) &&
      (!bootstrap.selfProfessionalOnly ||
        appointment.services.some((service) =>
          service.professionals.some(
            (item) => item.professionalProfileId === professional,
          ),
        )),
  );
}
function visibleCustomers(state: DesignState) {
  const bootstrap = designBootstrap(state);
  return state.customers.filter((customer) =>
    customer.currentPortfolios.some(
      (portfolio) =>
        portfolio.branchId &&
        bootstrap.authorizedBranchIds.includes(portfolio.branchId) &&
        (!bootstrap.selfProfessionalOnly ||
          portfolio.employeeId === bootstrap.professionalEmployeeId),
    ),
  );
}
function customer(state: DesignState, id: string) {
  return (
    visibleCustomers(state).find((item) => item.id === id) ??
    fail(404, "Cliente no encontrado.")
  );
}
function appointment(state: DesignState, id: string) {
  return (
    visibleAppointments(state).find((item) => item.id === id) ??
    fail(404, "Cita no encontrada.")
  );
}
function consumeAuthorization(
  state: DesignState,
  token: unknown,
  purpose?: string,
  targetId?: string,
) {
  const key = String(token ?? "");
  const auth = state.authorizations.get(key);
  if (
    !auth ||
    auth.accountId !== state.controls.accountId ||
    auth.expiresAt < Date.now() ||
    (purpose && auth.purpose !== purpose) ||
    (targetId && auth.targetId && auth.targetId !== targetId)
  ) {
    fail(403, "Autorización demo inválida o vencida.");
  }
  state.authorizations.delete(key);
}

function publicOperationAgent(
  agent: DesignState["operationAgents"][number],
): DesignOperationAgent {
  return {
    id: agent.id,
    externalId: agent.externalId,
    name: agent.name,
    role: agent.role,
    source: agent.source,
    active: agent.active,
    codeConfigured: Boolean(agent.code),
    canAuthorizePurchases:
      agent.source === "SCHEDULER" ||
      /(especialista|facialista|cosmet[oó]log)/i.test(agent.role),
    allowedPurposes: [...agent.allowedPurposes],
    updatedAt: agent.updatedAt,
  };
}

function operationPurpose(value: unknown): DesignOperationPurpose {
  const purposes: DesignOperationPurpose[] = [
    "APPOINTMENT_CREATE",
    "APPOINTMENT_UPDATE",
    "APPOINTMENT_MOVE",
    "APPOINTMENT_STATUS_CHANGE",
    "APPOINTMENT_CANCEL",
    "SCHEDULE_BLOCK_CREATE",
    "SCHEDULE_BLOCK_UPDATE",
    "SCHEDULE_BLOCK_DELETE",
    "CUSTOMER_UPDATE",
    "PURCHASE_CAPTURE",
  ];
  if (!purposes.includes(value as DesignOperationPurpose)) {
    fail(400, "Propósito de autorización no reconocido.");
  }
  return value as DesignOperationPurpose;
}
function authorizeRequest(state: DesignState, request: DesignRequest) {
  const path = request.url.pathname;
  if (path === "/api/auth/login") return;
  if (
    request.headers.get("authorization") !==
    `Bearer ${designSessionToken(state.controls.accountId)}`
  )
    fail(401, "Inicia una sesión demo.");
  if (
    path === "/api/scheduler/bootstrap" ||
    path.includes("/authorizations") ||
    path.includes("/security/")
  )
    return;
  const admin =
    path.includes("/administration/") ||
    path.includes("/access") ||
    path.includes("/medical-records/") ||
    path.includes("/documents/") ||
    path.includes("/surveys") ||
    path.includes("/communications/") ||
    (path.includes("/operations/") && !path.endsWith("/catalog")) ||
    path.endsWith("/clients/merge") ||
    (path.includes("/clients/field-definitions") && isWriting(request.method));
  if (admin && state.controls.role !== "master")
    fail(403, "Esta acción requiere el perfil master demo.");
  if (
    (isWriting(request.method) || path.includes("/exports/")) &&
    state.controls.role === "read-only"
  )
    fail(403, "El perfil de consulta no puede modificar ni descargar.");
  if (request.url.searchParams.has("branchId"))
    inScope(state, request.url.searchParams.get("branchId")!);
  if (typeof request.body.branchId === "string")
    inScope(state, request.body.branchId);
}

export function designAvailability(state: DesignState, query: URLSearchParams) {
  const branchId = query.get("branchId") ?? "";
  inScope(state, branchId);
  const branch = state.catalog.branches.find(
    (item) => item.branchId === branchId,
  );
  const service = state.catalog.services.find(
    (item) => item.id === query.get("serviceProfileId"),
  );
  const date = query.get("date") ?? state.controls.date;
  const result = {
    branchId,
    serviceProfileId: service?.id ?? "",
    date,
    timezone: branch?.timezone ?? "America/Mexico_City",
    intervalMinutes: 15,
    slots: [] as SchedulerAvailabilitySlotDto[],
  };
  if (
    !branch?.active ||
    !branch.bookingEnabled ||
    !service?.active ||
    !service.branchProfileIds.includes(branch.id)
  )
    return result;
  const weekday = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ][new Date(`${date}T12:00:00Z`).getUTCDay()];
  const professionals = state.catalog.professionals.filter(
    (item) =>
      item.active &&
      item.employeeActive &&
      item.branchProfileIds.includes(branch.id) &&
      (!query.get("professionalProfileId") ||
        query.get("professionalProfileId") === item.id) &&
      (state.controls.role !== "specialist" ||
        item.employeeId === designBootstrap(state).professionalEmployeeId) &&
      state.catalog.professionalServices.some(
        (relation) =>
          relation.active &&
          relation.professionalProfileId === item.id &&
          relation.serviceProfileId === service.id &&
          relation.branchProfileId === branch.id,
      ),
  );
  function open(
    ownerType: string,
    ownerId: string,
    minute: number,
    end: number,
  ) {
    const rules = state.catalog.availabilityRules.filter(
      (rule) =>
        rule.branchProfileId === branch!.id &&
        rule.ownerType === ownerType &&
        rule.ownerId === ownerId &&
        rule.weekday === weekday,
    );
    const working = rules.some(
      (rule) =>
        rule.kind === "WORKING" &&
        rule.startMinute <= minute &&
        rule.endMinute >= end,
    );
    const blocked =
      rules.some(
        (rule) =>
          rule.kind === "BREAK" &&
          rule.startMinute < end &&
          rule.endMinute > minute,
      ) ||
      state.catalog.availabilityExceptions.some(
        (exception) =>
          exception.branchProfileId === branch!.id &&
          exception.ownerId === ownerId &&
          exception.date === date &&
          exception.kind === "UNAVAILABLE" &&
          (exception.startMinute ?? 0) < end &&
          (exception.endMinute ?? 1440) > minute,
      );
    return working && !blocked;
  }
  for (const professional of professionals) {
    for (
      let minute = 0;
      minute + service.durationMinutes <= 1440;
      minute += 15
    ) {
      const end = minute + service.durationMinutes;
      if (
        !open("BRANCH", branch.id, minute, end) ||
        !open("PROFESSIONAL", professional.id, minute, end)
      )
        continue;
      if (
        service.mode === "CLASS" &&
        !state.administration.classSchedules.some(
          (item) =>
            item.active &&
            item.serviceProfileId === service.id &&
            item.branchProfileId === branch.id &&
            item.professionalProfileId === professional.id &&
            item.weekday === weekday &&
            item.startMinute === minute,
        )
      )
        continue;
      const startsAt = designInstant(date, minute),
        endsAt = designInstant(date, end);
      const resourceIds = [
        ...new Set([
          ...state.catalog.resourceRequirements
            .filter(
              (item) =>
                item.active &&
                item.serviceProfileId === service.id &&
                state.catalog.resources.some(
                  (resource) =>
                    resource.id === item.resourceId &&
                    resource.branchProfileId === branch.id,
                ),
            )
            .map((item) => item.resourceId),
          ...(query.get("resourceId") ? [query.get("resourceId")!] : []),
        ]),
      ];
      if (
        resourceIds.some(
          (id) =>
            !state.catalog.resources.some(
              (resource) =>
                resource.id === id &&
                resource.active &&
                resource.branchProfileId === branch.id,
            ) || !open("RESOURCE", id, minute, end),
        )
      )
        continue;
      const busy = state.appointments.some(
        (item) =>
          item.branchId === branchId &&
          !["CANCELED", "NO_SHOW"].includes(item.status) &&
          item.services.some(
            (line) =>
              intervalsOverlap(
                startsAt,
                endsAt,
                line.occupiesFrom,
                line.occupiesUntil,
              ) &&
              (line.professionals.some(
                (person) => person.professionalProfileId === professional.id,
              ) ||
                line.resources.some((resource) =>
                  resourceIds.includes(resource.resourceId),
                )),
          ),
      );
      const blocked = state.blocks.some(
        (item) =>
          item.branchId === branchId &&
          item.status === "ACTIVE" &&
          intervalsOverlap(startsAt, endsAt, item.startsAt, item.endsAt) &&
          ((!item.professionalProfileId && !item.resourceId) ||
            item.professionalProfileId === professional.id ||
            (item.resourceId && resourceIds.includes(item.resourceId))),
      );
      if (!busy && !blocked)
        result.slots.push({
          startsAt,
          endsAt,
          professionalProfileId: professional.id,
          professionalName: professional.name,
          resourceIds,
          remainingCapacity: service.capacity,
        });
    }
  }
  return result;
}
function checkAppointmentAvailability(
  state: DesignState,
  item: SchedulerAppointmentDto,
  excludedId?: string,
) {
  const candidateState = {
    ...state,
    appointments: state.appointments.filter((entry) => entry.id !== excludedId),
  };
  for (const line of item.services) {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: item.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(line.startsAt));
    for (const professional of line.professionals) {
      const slots = designAvailability(
        candidateState,
        new URLSearchParams({
          branchId: item.branchId,
          serviceProfileId: line.serviceProfileId,
          date,
          professionalProfileId: professional.professionalProfileId,
        }),
      );
      if (!slots.slots.some((slot) => slot.startsAt === line.startsAt))
        fail(409, "El horario ya no está disponible.", "PROFESSIONAL_BUSY");
    }
  }
}
function patchCollection(
  collection: DesignRow[],
  body: DesignRow,
  id?: string,
  field = "id",
) {
  let item = id ? collection.find((row) => row[field] === id) : undefined;
  if (item) versionGuard(item, body);
  else {
    item = {
      id: designId("design-record"),
      ...(id ? { [field]: id } : {}),
      effectiveFrom: new Date().toISOString(),
      effectiveTo: null,
    };
    collection.push(item);
  }
  const version = Number(item.version ?? item.currentVersion ?? 0) + 1;
  const {
    expectedVersion: _version,
    authorizationToken: _token,
    ...values
  } = body;
  Object.assign(item, values, {
    version,
    currentVersion: version,
    updatedAt: new Date().toISOString(),
  });
  return item;
}
function buildReport(
  state: DesignState,
  key: SchedulerReportKey,
  query: URLSearchParams,
  exporting: boolean,
) {
  const fixture = schedulerReportRv7Fixture(key);
  const selected =
    query.get("branchIds")?.split(",").filter(Boolean) ??
    designBootstrap(state).authorizedBranchIds;
  selected.forEach((id) => inScope(state, id));
  const start = query.get("dateFrom") ?? state.controls.date;
  const end = query.get("dateTo") ?? state.controls.date;
  const appointments = visibleAppointments(state).filter(
    (item) =>
      selected.includes(item.branchId) &&
      item.startsAt.slice(0, 10) >= start &&
      item.startsAt.slice(0, 10) <= end &&
      (!query.get("status") || item.status === query.get("status")) &&
      (!query.get("search") ||
        textKey(item.customerName).includes(textKey(query.get("search")))),
  );
  let resultRows = fixture.rows;
  if (["APPOINTMENTS", "CANCELLATIONS", "NO_SHOW"].includes(key)) {
    resultRows = appointments
      .filter(
        (item) =>
          key === "APPOINTMENTS" ||
          item.status === (key === "CANCELLATIONS" ? "CANCELED" : "NO_SHOW"),
      )
      .map((item) => ({
        appointment_id: item.id,
        branch_id: item.branchId,
        Fecha: item.startsAt.slice(0, 10),
        Sucursal: item.branchName,
        Cliente: item.customerName,
        Servicios: item.services.map((line) => line.serviceName).join(", "),
        Profesionales: item.services
          .flatMap((line) => line.professionals.map((person) => person.name))
          .join(", "),
        Estado: item.status,
        Origen: item.origin,
        Venta: "0.00",
        Cobrado: "0.00",
      }));
  } else if (key === "CUSTOMERS") {
    resultRows = visibleCustomers(state)
      .filter(
        (item) =>
          item.active &&
          item.currentPortfolios.some(
            (portfolio) =>
              portfolio.branchId && selected.includes(portfolio.branchId),
          ),
      )
      .map((item) => ({
        customer_id: item.id,
        Cliente: item.displayName,
        Procedencia: item.source?.name ?? "",
        Citas: appointments.filter((entry) => entry.customerId === item.id)
          .length,
        Atendidas: appointments.filter(
          (entry) =>
            entry.customerId === item.id && entry.status === "ATTENDED",
        ).length,
        Canceladas: appointments.filter(
          (entry) =>
            entry.customerId === item.id && entry.status === "CANCELED",
        ).length,
        "No show": appointments.filter(
          (entry) => entry.customerId === item.id && entry.status === "NO_SHOW",
        ).length,
        Venta: "0.00",
      }));
  }
  if (state.controls.scenario === "empty") resultRows = [];
  const total = resultRows.length;
  const paged = page(resultRows, query);
  const summary = [
    "APPOINTMENTS",
    "CANCELLATIONS",
    "NO_SHOW",
    "CUSTOMERS",
  ].includes(key)
    ? {
        Registros: total,
        Citas: appointments.length,
        Atendidas: appointments.filter((item) => item.status === "ATTENDED")
          .length,
        Canceladas: appointments.filter((item) => item.status === "CANCELED")
          .length,
        "No show": appointments.filter((item) => item.status === "NO_SHOW")
          .length,
        Venta: "0.00",
      }
    : fixture.summary;
  return {
    ...fixture,
    dateFrom: start,
    dateTo: end,
    branchIds: selected,
    timeZones: Object.fromEntries(
      selected.map((id) => [id, "America/Mexico_City"]),
    ),
    generatedAt: new Date().toISOString(),
    rows: exporting ? resultRows : paged.items,
    summary,
    total,
    page: paged.page,
    pageSize: exporting ? total : paged.pageSize,
    notes: [
      "Entorno de diseño: datos sintéticos. Citas y clientes reflejan la sesión; otros datasets son ejemplos visuales.",
    ],
  };
}

function localDateKey(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function cabinSalesBreakdown(
  rowsToGroup: DesignCabinSalesReportRow[],
  keyForRow: (row: DesignCabinSalesReportRow) => string,
  labelForRow: (row: DesignCabinSalesReportRow) => string,
): DesignCabinSalesReportBreakdown[] {
  const groups = new Map<
    string,
    { label: string; rows: DesignCabinSalesReportRow[] }
  >();
  for (const row of rowsToGroup) {
    const key = keyForRow(row);
    const group = groups.get(key) ?? { label: labelForRow(row), rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      label: group.label,
      appointments: new Set(group.rows.map((row) => row.appointmentId)).size,
      visitors: group.rows.length,
      buyers: group.rows.filter((row) => row.purchaseKind !== "NONE").length,
      saleAmount: group.rows.reduce((sum, row) => sum + row.saleAmount, 0),
      depositAmount: group.rows.reduce(
        (sum, row) => sum + row.depositAmount,
        0,
      ),
      balanceAmount: group.rows.reduce(
        (sum, row) => sum + row.balanceAmount,
        0,
      ),
    }))
    .sort((left, right) => left.key.localeCompare(right.key, "es-MX"));
}

function buildCabinSalesReport(
  state: DesignState,
  input: DesignCabinSalesReportFilters,
): DesignCabinSalesReport {
  const authorized = designBootstrap(state).authorizedBranchIds;
  const branchIds = (input.branchIds.length ? input.branchIds : authorized)
    .filter((branchId, index, values) => values.indexOf(branchId) === index);
  branchIds.forEach((branchId) => inScope(state, branchId));
  if (!input.dateFrom || !input.dateTo || input.dateFrom > input.dateTo) {
    fail(400, "Selecciona un rango de fechas válido.");
  }
  const query = textKey(input.query ?? "");
  const reportRows: DesignCabinSalesReportRow[] = [];
  for (const appointmentItem of visibleAppointments(state)) {
    const visit = state.appointmentCabinVisits[appointmentItem.id];
    const date = localDateKey(
      appointmentItem.startsAt,
      appointmentItem.timezone,
    );
    if (
      !visit ||
      !branchIds.includes(appointmentItem.branchId) ||
      date < input.dateFrom ||
      date > input.dateTo ||
      (input.cabinResourceId &&
        visit.cabinResourceId !== input.cabinResourceId)
    ) {
      continue;
    }
    const customerItem = state.customers.find(
      (candidate) => candidate.id === appointmentItem.customerId,
    );
    const sellerName = String(
      customerItem?.customFields.find(
        (field) => field.definitionId === "design-field-sales-owner",
      )?.value ??
        customerItem?.currentPortfolios.find(
          (portfolio) => portfolio.branchId === appointmentItem.branchId,
        )?.ownerName ??
        "Sin asignar",
    );
    const confirmedAt =
      appointmentItem.stateHistory.find(
        (history) => history.toStatus === "CONFIRMED",
      )?.createdAt ?? null;
    for (const visitor of visit.visitors) {
      const specialistName =
        state.catalog.professionals.find(
          (professional) => professional.id === visitor.specialistProfileId,
        )?.name ?? "Sin especialista";
      const purchaseKind =
        visitor.purchaseKind ??
        (visitor.purchased === true
          ? "FULL"
          : visitor.purchased === false
            ? "NONE"
            : "NONE");
      if (visitor.purchaseKind === null && visitor.purchased === null) {
        continue;
      }
      const saleAmount =
        purchaseKind === "NONE"
          ? 0
          : Number(visitor.saleAmount ?? visitor.purchaseAmount ?? 0);
      const depositAmount =
        purchaseKind === "FULL"
          ? saleAmount
          : purchaseKind === "LAYAWAY"
            ? Number(visitor.depositAmount ?? 0)
            : 0;
      const row: DesignCabinSalesReportRow = {
        appointmentId: appointmentItem.id,
        visitorId: visitor.id,
        appointmentCreatedAt: appointmentItem.createdAt,
        confirmedAt,
        appointmentStartsAt: appointmentItem.startsAt,
        appointmentEndsAt: appointmentItem.endsAt,
        branchId: appointmentItem.branchId,
        branchName: appointmentItem.branchName,
        cabinResourceId: visit.cabinResourceId,
        cabinName: visit.cabinName,
        cabinCapacity: visit.cabinCapacity,
        customerId: appointmentItem.customerId,
        customerName: appointmentItem.customerName,
        visitorName: visitor.name,
        serviceNames: appointmentItem.services.map(
          (service) => service.serviceName,
        ),
        sellerName,
        specialistProfileId: visitor.specialistProfileId,
        specialistName,
        purchaseKind,
        saleAmount,
        depositAmount,
        balanceAmount: Math.max(0, saleAmount - depositAmount),
        notes: appointmentItem.notes ?? "",
        status: appointmentItem.status,
        origin: appointmentItem.origin,
        cancellationReason: appointmentItem.cancellationReason ?? "",
        updatedAt: appointmentItem.updatedAt,
      };
      if (
        query &&
        ![
          row.appointmentId,
          row.customerName,
          row.visitorName,
          row.branchName,
          row.cabinName,
          row.serviceNames.join(" "),
          row.sellerName,
          row.specialistName,
          row.notes,
          row.status,
          row.origin,
        ].some((value) => textKey(value).includes(query))
      ) {
        continue;
      }
      reportRows.push(row);
    }
  }
  const rowsSorted = reportRows.sort((left, right) =>
    right.appointmentStartsAt.localeCompare(left.appointmentStartsAt),
  );
  const buyers = rowsSorted.filter((row) => row.purchaseKind !== "NONE");
  return {
    generatedAt: new Date().toISOString(),
    filters: {
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      branchIds,
      ...(input.cabinResourceId
        ? { cabinResourceId: input.cabinResourceId }
        : {}),
      ...(input.query?.trim() ? { query: input.query.trim() } : {}),
    },
    summary: {
      appointments: new Set(rowsSorted.map((row) => row.appointmentId)).size,
      visitors: rowsSorted.length,
      buyers: buyers.length,
      fullSales: buyers.filter((row) => row.purchaseKind === "FULL").length,
      layaways: buyers.filter((row) => row.purchaseKind === "LAYAWAY").length,
      saleAmount: rowsSorted.reduce((sum, row) => sum + row.saleAmount, 0),
      depositAmount: rowsSorted.reduce(
        (sum, row) => sum + row.depositAmount,
        0,
      ),
      balanceAmount: rowsSorted.reduce(
        (sum, row) => sum + row.balanceAmount,
        0,
      ),
      conversionRate: rowsSorted.length
        ? Math.round((buyers.length / rowsSorted.length) * 10_000) / 100
        : 0,
    },
    byCabin: cabinSalesBreakdown(
      rowsSorted,
      (row) => row.cabinResourceId,
      (row) => row.cabinName,
    ),
    byDay: cabinSalesBreakdown(
      rowsSorted,
      (row) => localDateKey(row.appointmentStartsAt, "America/Mexico_City"),
      (row) => localDateKey(row.appointmentStartsAt, "America/Mexico_City"),
    ),
    rows: rowsSorted,
  };
}

function advancedCustomerSearch(
  state: DesignState,
  input: DesignCustomerAdvancedFilters,
): DesignCustomerAdvancedPage {
  const branchIds = new Set(input.branchIds.filter(Boolean));
  const statuses = new Set(input.appointmentStatuses);
  const serviceIds = new Set(input.serviceProfileIds);
  const sellerNames = new Set(input.sellerNames.map(textKey));
  const referenceTime = new Date(
    designInstant(state.controls.date, 23 * 60 + 59),
  ).getTime();
  const inactivityBoundary = input.noAppointmentWithinDays
    ? referenceTime - input.noAppointmentWithinDays * 86_400_000
    : null;

  const matched = visibleCustomers(state)
    .filter((item) => {
      if (!item.active) return false;
      const customerAppointments = state.appointments.filter(
        (appointment) => appointment.customerId === item.id,
      );
      const historicalAppointments = customerAppointments.filter(
        (appointment) =>
          new Date(appointment.startsAt).getTime() <= referenceTime,
      );
      if (
        branchIds.size > 0 &&
        !item.currentPortfolios.some((portfolio) =>
          branchIds.has(portfolio.branchId ?? ""),
        ) &&
        !customerAppointments.some((appointment) =>
          branchIds.has(appointment.branchId),
        )
      ) {
        return false;
      }
      if (input.sourceId && item.source?.id !== input.sourceId) return false;
      if (
        input.query.trim() &&
        ![item.displayName, item.phone, item.email, ...item.aliases].some(
          (value) => textKey(value).includes(textKey(input.query)),
        )
      ) {
        return false;
      }
      if (
        inactivityBoundary !== null &&
        historicalAppointments.some(
          (appointment) =>
            new Date(appointment.startsAt).getTime() >= inactivityBoundary,
        )
      ) {
        return false;
      }
      if (
        statuses.size > 0 &&
        !customerAppointments.some((appointment) =>
          statuses.has(appointment.status),
        )
      ) {
        return false;
      }
      if (
        serviceIds.size > 0 &&
        !customerAppointments.some((appointment) =>
          appointment.services.some((service) =>
            serviceIds.has(service.serviceProfileId),
          ),
        )
      ) {
        return false;
      }
      if (input.birthdayMonth) {
        const birthDate = item.customFields.find(
          (field) => field.definitionId === "design-field-birthday",
        )?.value;
        const month = Number(String(birthDate ?? "").slice(5, 7));
        if (month !== input.birthdayMonth) return false;
      }
      if (sellerNames.size > 0) {
        const assignedSellers = [
          ...item.currentPortfolios.map((portfolio) => portfolio.ownerName),
          item.customFields.find(
            (field) => field.definitionId === "design-field-sales-owner",
          )?.value,
        ].map(textKey);
        if (!assignedSellers.some((seller) => sellerNames.has(seller))) {
          return false;
        }
      }
      return input.customFields.every((filter) => {
        if (!filter.value.trim()) return true;
        const value = item.customFields.find(
          (field) => field.definitionId === filter.definitionId,
        )?.value;
        return textKey(value).includes(textKey(filter.value));
      });
    })
    .map((item) => {
      const appointments = state.appointments.filter(
        (appointment) => appointment.customerId === item.id,
      );
      const historical = appointments.filter(
        (appointment) =>
          new Date(appointment.startsAt).getTime() <= referenceTime,
      );
      const lastAppointmentAt = historical.reduce<string | null>(
        (latest, appointment) =>
          !latest || appointment.startsAt > latest
            ? appointment.startsAt
            : latest,
        null,
      );
      return {
        ...item,
        agenda: {
          appointmentCount: appointments.length,
          attendedCount: appointments.filter(
            (appointment) => appointment.status === "ATTENDED",
          ).length,
          canceledCount: appointments.filter(
            (appointment) => appointment.status === "CANCELED",
          ).length,
          noShowCount: appointments.filter(
            (appointment) => appointment.status === "NO_SHOW",
          ).length,
          lastAppointmentAt,
        },
      };
    })
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, "es-MX"),
    );

  const pageNumber = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(input.pageSize) || 25));
  const offset = (pageNumber - 1) * pageSize;
  return {
    items: matched.slice(offset, offset + pageSize),
    page: pageNumber,
    pageSize,
    total: matched.length,
  };
}

function dispatch(state: DesignState, request: DesignRequest): unknown {
  const { body, url, headers, method } = request;
  const path = url.pathname,
    query = url.searchParams,
    parts = path.split("/").filter(Boolean);
  const resource = parts[2],
    id = parts[3],
    action = parts[4];
  if (path === "/api/auth/login") {
    const account =
      designDemoAccounts.find(
        (candidate) =>
          candidate.email === String(body.email).trim().toLowerCase() &&
          candidate.password === body.password,
      ) ?? fail(401, "Usa una cuenta demo y la contraseña demo.");
    state.controls.accountId = account.id;
    state.controls.role = account.role;
    state.authorizations.clear();
    return { token: designSessionToken(account.id) };
  }
  if (resource === "bootstrap") return designBootstrap(state);
  if (resource === "security") return { updated: true };
  if (resource === "authorizations") {
    if (id === "consume") {
      consumeAuthorization(state, body.token, String(body.purpose));
      return { consumed: true };
    }
    const account = designAccountForControls(state.controls);
    if (body.secret !== account.authorizationCode)
      fail(403, "Código demo incorrecto.");
    if (
      state.controls.role === "read-only" &&
      !String(body.purpose).endsWith("_VIEW")
    )
      fail(403, "El perfil de consulta no autoriza modificaciones.");
    const token = designId("design-authorization"),
      expiresAt = Date.now() + 120_000;
    state.authorizations.set(token, {
      accountId: account.id,
      purpose: String(body.purpose),
      targetId: String(body.targetId ?? ""),
      expiresAt,
    });
    return {
      token,
      purpose: body.purpose,
      expiresAt: new Date(expiresAt).toISOString(),
      actor: {
        userId: `design-${account.id}`,
        name: designBootstrap(state).user.name,
      },
    };
  }
  if (resource === "design-proposals") {
    if (id === "status-definitions") {
      const commerceId = String(
        body.commerceId ?? query.get("commerceId") ?? "",
      );
      if (
        !state.catalog.commerces.some(
          (commerce) => commerce.id === commerceId && commerce.active,
        )
      ) {
        fail(400, "Selecciona un comercio activo.");
      }
      if (method === "GET") {
        return {
          items: state.statusDefinitions
            .filter((definition) => definition.commerceId === commerceId)
            .sort((left, right) =>
              left.label.localeCompare(right.label, "es-MX"),
            ),
          revisions: state.statusDefinitionHistory
            .filter((revision) => revision.commerceId === commerceId)
            .sort((left, right) =>
              right.effectiveFrom.localeCompare(left.effectiveFrom),
            ),
        };
      }
      if (!["POST", "PUT"].includes(method)) {
        fail(405, "Usa GET, POST o PUT para el catálogo de status.");
      }
      if (state.controls.role !== "master") {
        fail(403, "Sólo master puede administrar el catálogo de status.");
      }
      consumeAuthorization(
        state,
        body.authorizationToken,
        "STATUS_COLORS_CHANGE",
        commerceId,
      );
      const label = String(body.label ?? "").trim();
      const color = String(body.color ?? "").toLowerCase();
      if (label.length < 2 || label.length > 40) {
        fail(400, "El nombre del status debe tener de 2 a 40 caracteres.");
      }
      if (!/^#[0-9a-f]{6}$/.test(color)) {
        fail(400, "Selecciona un color hexadecimal válido.");
      }
      const existing = action
        ? state.statusDefinitions.find(
            (definition) =>
              definition.id === action &&
              definition.commerceId === commerceId,
          )
        : undefined;
      if (method === "PUT" && !existing) {
        fail(404, "Status no encontrado.");
      }
      if (existing) versionGuard(existing, body);
      const wasActive = existing?.active;
      if (
        state.statusDefinitions.some(
          (definition) =>
            definition.commerceId === commerceId &&
            definition.id !== existing?.id &&
            textKey(definition.label) === textKey(label),
        )
      ) {
        fail(409, "Ya existe un status con ese nombre.");
      }
      const updatedAt = new Date().toISOString();
      let definition: DesignStatusDefinition;
      if (existing) {
        const openRevision = state.statusDefinitionHistory.find(
          (revision) =>
            revision.id === existing.id &&
            revision.effectiveTo === null,
        );
        if (openRevision) openRevision.effectiveTo = updatedAt;
        existing.label = label;
        existing.color = color;
        existing.active = body.active !== false;
        existing.version += 1;
        existing.updatedAt = updatedAt;
        definition = existing;
      } else {
        const baseKey = textKey(label)
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .toUpperCase();
        if (!baseKey) fail(400, "No fue posible generar la clave del status.");
        let key = `CUSTOM_${baseKey}`;
        let suffix = 2;
        while (
          state.statusDefinitions.some(
            (candidate) =>
              candidate.commerceId === commerceId && candidate.key === key,
          )
        ) {
          key = `CUSTOM_${baseKey}_${suffix}`;
          suffix += 1;
        }
        definition = {
          id: designId("design-status"),
          commerceId,
          key,
          canonicalStatus: null,
          label,
          color,
          active: body.active !== false,
          system: false,
          version: 1,
          createdAt: updatedAt,
          updatedAt,
        };
        state.statusDefinitions.push(definition);
      }
      const revision: DesignStatusDefinitionRevision = {
        ...definition,
        effectiveFrom: updatedAt,
        effectiveTo: null,
      };
      state.statusDefinitionHistory.push(revision);

      if (definition.canonicalStatus) {
        const palette =
          state.administration.statusColors.find(
            (entry) => entry.commerceId === commerceId,
          ) ??
          (() => {
            const created = { commerceId, colors: [] };
            state.administration.statusColors.push(created);
            return created;
          })();
        palette.colors = palette.colors.filter(
          (entry) => entry.status !== definition.canonicalStatus,
        );
        if (definition.active) {
          palette.colors.push({
            status: definition.canonicalStatus,
            color: definition.color,
            version: definition.version,
          });
        }
      }
      state.movements.unshift({
        id: designId("design-movement"),
        actorId: designBootstrap(state).user.id,
        actor: designBootstrap(state).user.name,
        actorRole: designBootstrap(state).user.positionName ?? "Sesión",
        actorSource: "SESSION",
        action: existing
          ? wasActive && !definition.active
            ? "Inactivación de status"
            : "Actualización de status"
          : "Alta de status",
        purpose: "SYSTEM_WRITE",
        targetType: "STATUS_DEFINITION",
        targetId: definition.id,
        createdAt: updatedAt,
        metadata: {
          commerceId,
          statusKey: definition.key,
          version: String(definition.version),
          active: String(definition.active),
        },
      });
      return definition;
    }
    if (id === "reports" && action === "cabin-sales") {
      if (method !== "POST") fail(405, "Usa POST para el reporte por cabina.");
      return buildCabinSalesReport(state, {
        dateFrom: String(body.dateFrom ?? ""),
        dateTo: String(body.dateTo ?? ""),
        branchIds: Array.isArray(body.branchIds)
          ? body.branchIds.map(String)
          : [],
        ...(typeof body.cabinResourceId === "string" && body.cabinResourceId
          ? { cabinResourceId: body.cabinResourceId }
          : {}),
        ...(typeof body.query === "string" && body.query.trim()
          ? { query: body.query.trim() }
          : {}),
      });
    }
    if (id === "customers" && action === "advanced-search") {
      if (method !== "POST") fail(405, "Usa POST para la búsqueda avanzada.");
      const input = body as unknown as DesignCustomerAdvancedFilters;
      return advancedCustomerSearch(state, {
        query: String(input.query ?? ""),
        branchIds: Array.isArray(input.branchIds)
          ? input.branchIds.map(String)
          : [],
        ...(input.sourceId ? { sourceId: String(input.sourceId) } : {}),
        ...(Number(input.noAppointmentWithinDays) > 0
          ? { noAppointmentWithinDays: Number(input.noAppointmentWithinDays) }
          : {}),
        appointmentStatuses: Array.isArray(input.appointmentStatuses)
          ? input.appointmentStatuses.filter((status) =>
              SCHEDULER_APPOINTMENT_STATUSES.includes(status),
            )
          : [],
        serviceProfileIds: Array.isArray(input.serviceProfileIds)
          ? input.serviceProfileIds.map(String)
          : [],
        ...(Number(input.birthdayMonth) >= 1 &&
        Number(input.birthdayMonth) <= 12
          ? { birthdayMonth: Number(input.birthdayMonth) }
          : {}),
        sellerNames: Array.isArray(input.sellerNames)
          ? input.sellerNames.map(String)
          : [],
        customFields: Array.isArray(input.customFields)
          ? input.customFields.map((filter) => ({
              definitionId: String(filter.definitionId ?? ""),
              value: String(filter.value ?? ""),
            }))
          : [],
        page: Number(input.page) || 1,
        pageSize: Number(input.pageSize) || 25,
      });
    }
    if (id === "authorization-agents") {
      if (method === "GET") {
        return state.operationAgents.map(publicOperationAgent);
      }
      if (state.controls.role !== "master") {
        fail(403, "Sólo master puede administrar códigos ficticios.");
      }
      const agentId = action;
      const existing = agentId
        ? state.operationAgents.find((agent) => agent.id === agentId)
        : undefined;
      if (agentId && !existing) fail(404, "Agente no encontrado.");
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (code && !/^\d{4,12}$/.test(code)) {
        fail(400, "El código debe contener de 4 a 12 dígitos.");
      }
      if (
        code &&
        code !== existing?.code &&
        state.usedAuthorizationCodes.has(code)
      ) {
        fail(409, "Ese código ya fue asignado y no puede repetirse.");
      }
      if (!existing && !code) fail(400, "Captura un código inicial.");
      const updatedAt = new Date().toISOString();
      const next = existing ?? {
        id: designId("design-agent"),
        externalId: String(body.externalId ?? designId("external-agent")),
        name: "",
        role: "Vendedor",
        source: "POS_CRM" as const,
        active: true,
        code: "",
        allowedPurposes: [
          "APPOINTMENT_STATUS_CHANGE",
        ] as DesignOperationPurpose[],
        updatedAt,
      };
      next.externalId = String(body.externalId ?? next.externalId);
      next.name = String(body.name ?? next.name).trim();
      next.role = String(body.role ?? next.role).trim();
      next.source = body.source === "SCHEDULER" ? "SCHEDULER" : "POS_CRM";
      next.active = body.active !== false;
      next.allowedPurposes = Array.isArray(body.allowedPurposes)
        ? body.allowedPurposes.map(operationPurpose)
        : next.allowedPurposes;
      next.updatedAt = updatedAt;
      if (!next.name || !next.role)
        fail(400, "Captura nombre y rol del agente.");
      if (code && code !== next.code) {
        state.usedAuthorizationCodes.add(code);
        next.code = code;
      }
      if (!existing) state.operationAgents.push(next);
      return publicOperationAgent(next);
    }
    if (id === "operation-authorizations") {
      if (action === "commit") {
        const token = String(body.token ?? "");
        const authorization =
          state.operationAuthorizations.get(token) ??
          fail(403, "La autorización del movimiento es inválida o venció.");
        if (authorization.expiresAt < Date.now()) {
          fail(403, "La autorización del movimiento es inválida o venció.");
        }
        const targetId = String(body.targetId ?? "");
        if (authorization.targetId && authorization.targetId !== targetId) {
          fail(403, "La autorización pertenece a otro registro.");
        }
        const agent =
          state.operationAgents.find(
            (candidate) => candidate.id === authorization.agentId,
          ) ?? fail(403, "El agente ya no está activo.");
        if (!agent.active) fail(403, "El agente ya no está activo.");
        if (!agent.allowedPurposes.includes(authorization.purpose)) {
          fail(403, "El agente ya no tiene permiso para este movimiento.");
        }
        state.operationAuthorizations.delete(token);
        const movement: DesignMovementRecord = {
          id: designId("design-movement"),
          actorId: agent.id,
          actor: agent.name,
          actorRole: agent.role,
          actorSource: agent.source,
          action: String(body.action ?? authorization.purpose),
          purpose: authorization.purpose,
          targetType: String(body.targetType ?? authorization.targetType),
          targetId,
          createdAt: new Date().toISOString(),
          metadata: Object.fromEntries(
            Object.entries(record(body.metadata)).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
        };
        state.movements.unshift(movement);
        return movement;
      }
      const code = String(body.code ?? "").trim();
      const agent =
        state.operationAgents.find(
          (candidate) => candidate.active && candidate.code === code,
        ) ?? fail(403, "Código personal ficticio incorrecto o inactivo.");
      const token = designId("design-operation-authorization");
      const expiresAt = Date.now() + 120_000;
      const purpose = operationPurpose(body.purpose);
      if (
        purpose === "PURCHASE_CAPTURE" &&
        agent.source !== "SCHEDULER" &&
        !/(especialista|facialista|cosmet[oó]log)/i.test(agent.role)
      ) {
        fail(
          403,
          "El código de compra debe pertenecer a un especialista o agente de Scheduler.",
        );
      }
      if (!agent.allowedPurposes.includes(purpose)) {
        fail(
          403,
          "Este especialista o agente no tiene permiso para este movimiento.",
        );
      }
      state.operationAuthorizations.set(token, {
        agentId: agent.id,
        purpose,
        targetType: String(body.targetType ?? ""),
        targetId: String(body.targetId ?? ""),
        expiresAt,
      });
      return {
        token,
        purpose,
        expiresAt: new Date(expiresAt).toISOString(),
        actor: {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          source: agent.source,
        },
      };
    }
    if (id === "movements") return state.movements;
    if (id === "appointments" && parts[5] === "answers") {
      const appointmentId = String(action ?? "");
      appointment(state, appointmentId);
      if (method === "GET")
        return state.appointmentAnswers[appointmentId] ?? [];
      const answers = rows(body.answers).map((answer) => {
        const value = answer.value;
        if (!["string", "number", "boolean"].includes(typeof value)) {
          fail(400, "Respuesta adicional inválida.");
        }
        return {
          definitionId: String(answer.definitionId ?? ""),
          value,
        } as DesignAppointmentAnswer;
      });
      state.appointmentAnswers[appointmentId] = answers;
      return answers;
    }
    if (id === "appointments" && parts[5] === "cabin-visit") {
      const appointmentId = String(action ?? "");
      const appointmentItem = appointment(state, appointmentId);
      if (method === "GET") {
        return state.appointmentCabinVisits[appointmentId] ?? null;
      }
      if (method !== "PUT")
        fail(405, "Usa GET o PUT para la atención en cabina.");
      const cabin =
        state.catalog.resources.find(
          (resource) => resource.id === String(body.cabinResourceId ?? ""),
        ) ??
        fail(400, "Selecciona una cabina activa de la sucursal de la cita.");
      const branchProfile =
        state.catalog.branches.find(
          (branch) => branch.branchId === appointmentItem.branchId,
        ) ?? fail(400, "La cita no tiene una sucursal operativa válida.");
      if (
        !cabin.active ||
        cabin.kind !== "ROOM" ||
        cabin.branchProfileId !== branchProfile.id
      ) {
        fail(400, "Selecciona una cabina activa de la sucursal de la cita.");
      }
      const visitorRows = rows(body.visitors);
      if (visitorRows.length !== cabin.capacity) {
        fail(
          400,
          `La ${cabin.name} requiere ${cabin.capacity} visitante${cabin.capacity === 1 ? "" : "s"}.`,
        );
      }
      const visitors = visitorRows.map((visitor, index) => {
        const name = String(visitor.name ?? "").trim();
        const specialistProfileId = String(visitor.specialistProfileId ?? "");
        const specialist = state.catalog.professionals.find(
          (professional) =>
            professional.id === specialistProfileId &&
            professional.active &&
            professional.branchProfileIds.includes(branchProfile.id),
        );
        if (name.length < 2) {
          fail(400, `Captura el nombre del visitante ${index + 1}.`);
        }
        if (!specialist) {
          fail(400, `Asigna un especialista válido al visitante ${index + 1}.`);
        }
        const purchaseKind: DesignPurchaseKind =
          visitor.purchaseKind === "FULL" ||
          visitor.purchaseKind === "LAYAWAY" ||
          visitor.purchaseKind === "NONE"
            ? visitor.purchaseKind
            : visitor.purchased === true
              ? "FULL"
              : visitor.purchased === false
                ? "NONE"
                : null;
        const purchased = purchaseKind === null ? null : purchaseKind !== "NONE";
        const saleAmount = purchased
          ? Number(visitor.saleAmount ?? visitor.purchaseAmount)
          : null;
        const depositAmount =
          purchaseKind === "FULL"
            ? saleAmount
            : purchaseKind === "LAYAWAY"
              ? Number(visitor.depositAmount)
              : null;
        if (
          purchased &&
          (!Number.isFinite(saleAmount) || saleAmount! <= 0)
        ) {
          fail(400, `Captura un monto de venta mayor a cero para ${name}.`);
        }
        if (
          purchaseKind === "LAYAWAY" &&
          (!Number.isFinite(depositAmount) ||
            depositAmount! <= 0 ||
            depositAmount! > saleAmount!)
        ) {
          fail(
            400,
            `El apartado de ${name} debe ser mayor a cero y no superar la venta.`,
          );
        }
        return {
          id: String(visitor.id ?? `visitor-${index + 1}`),
          customerId:
            typeof visitor.customerId === "string" && visitor.customerId
              ? visitor.customerId
              : null,
          name,
          specialistProfileId,
          purchased,
          purchaseAmount: saleAmount,
          purchaseKind,
          saleAmount,
          depositAmount,
        };
      });
      if (
        new Set(visitors.map((visitor) => visitor.specialistProfileId)).size !==
        visitors.length
      ) {
        fail(
          400,
          "Asigna un especialista diferente a cada visitante de la cabina.",
        );
      }
      if (visitors.some((visitor) => visitor.purchased)) {
        const token = headers.get("x-design-operation-authorization") ?? "";
        const authorization = state.operationAuthorizations.get(token);
        const agent = authorization
          ? state.operationAgents.find(
              (candidate) => candidate.id === authorization.agentId,
            )
          : undefined;
        if (
          !authorization ||
          authorization.purpose !== "PURCHASE_CAPTURE" ||
          (authorization.targetId &&
            authorization.targetId !== appointmentId) ||
          authorization.expiresAt < Date.now() ||
          !agent?.active ||
          !agent.allowedPurposes.includes("PURCHASE_CAPTURE")
        ) {
          fail(
            403,
            "Registrar montos requiere autorización de un especialista o agente con permiso de compra.",
          );
        }
      }
      const result: DesignAppointmentCabinVisit = {
        appointmentId,
        cabinResourceId: cabin.id,
        cabinName: cabin.name,
        cabinCapacity: cabin.capacity,
        visitors,
        updatedAt: new Date().toISOString(),
      };
      state.appointmentCabinVisits[appointmentId] = result;
      return result;
    }
    fail(404, "Propuesta de diseño no encontrada.");
  }
  if (resource === "operations") {
    if (id === "catalog") {
      const allowed = designBootstrap(state).authorizedBranchIds;
      return {
        ...state.catalog,
        branches: state.catalog.branches.filter((branch) =>
          allowed.includes(branch.branchId),
        ),
        professionals: state.catalog.professionals.filter(
          (person) =>
            state.controls.role !== "specialist" ||
            person.employeeId === designBootstrap(state).professionalEmployeeId,
        ),
      };
    }
    if (id === "candidates") return state.candidates;
    const collections: Record<string, DesignRow[]> = {
      commerces: rows(state.catalog.commerces),
      branches: rows(state.catalog.branches),
      professionals: rows(state.catalog.professionals),
      services: rows(state.catalog.services),
      resources: rows(state.catalog.resources),
      specialties: rows(state.catalog.specialties),
      groups: rows(state.catalog.groups),
      "professional-services": rows(state.catalog.professionalServices),
      "resource-requirements": rows(state.catalog.resourceRequirements),
    };
    if (
      id === "availability" &&
      ["rules", "exceptions"].includes(action ?? "")
    ) {
      const collection =
        action === "rules"
          ? state.catalog.availabilityRules
          : state.catalog.availabilityExceptions;
      const retained = collection.filter(
        (item) =>
          item.branchProfileId !== body.branchProfileId ||
          item.ownerType !== body.ownerType ||
          item.ownerId !== body.ownerId,
      );
      const entries = rows(body[action!]).map((entry) => ({
        ...entry,
        id: designId("design-hours"),
        branchProfileId: body.branchProfileId,
        ownerType: body.ownerType,
        ownerId: body.ownerId,
        effectiveFrom: new Date().toISOString(),
        effectiveTo: null,
      }));
      if (action === "rules")
        state.catalog.availabilityRules = [
          ...retained,
          ...entries,
        ] as typeof state.catalog.availabilityRules;
      else
        state.catalog.availabilityExceptions = [
          ...retained,
          ...entries,
        ] as typeof state.catalog.availabilityExceptions;
      return { ids: entries.map((entry) => entry.id) };
    }
    const collection = collections[id ?? ""];
    if (collection && isWriting(method))
      return patchCollection(
        collection,
        body,
        action,
        {
          branches: "branchId",
          professionals: "employeeId",
          services: "catalogItemId",
        }[id as "branches"] ?? "id",
      );
  }
  if (resource === "availability") return designAvailability(state, query);
  if (resource === "appointments") {
    if (!id && method === "GET")
      return page(
        visibleAppointments(state).filter(
          (item) =>
            (!query.get("branchId") ||
              item.branchId === query.get("branchId")) &&
            item.startsAt < (query.get("to") ?? "9999") &&
            item.endsAt > (query.get("from") ?? "") &&
            (!query.get("customerId") ||
              item.customerId === query.get("customerId")) &&
            (!query.get("status") || item.status === query.get("status")),
        ),
        query,
      );
    if (id && method === "GET") return appointment(state, id);
    const existing = id ? appointment(state, id) : undefined;
    if (existing) versionGuard(existing, body);
    if (action === "cancel" || action === "status") {
      const status = action === "cancel" ? "CANCELED" : String(body.status);
      if (
        !(SCHEDULER_APPOINTMENT_STATUSES as readonly string[]).includes(status)
      )
        fail(400, "Estado inválido.");
      const previous = existing!.status;
      existing!.status = status as SchedulerAppointmentStatus;
      existing!.version += 1;
      existing!.cancellationReason =
        action === "cancel" ? String(body.reason ?? "") : null;
      existing!.updatedAt = new Date().toISOString();
      existing!.stateHistory.push({
        fromStatus: previous,
        toStatus: existing!.status,
        reason: String(body.reason ?? ""),
        version: existing!.version,
        actorUserId: designBootstrap(state).user.id,
        createdAt: existing!.updatedAt,
      });
      return existing;
    }
    let input = body as unknown as SchedulerAppointmentCreateDto;
    if (action === "move" && existing)
      input = {
        branchId: existing.branchId,
        customerId: existing.customerId,
        startsAt: String(body.startsAt),
        services:
          (body.services as SchedulerAppointmentCreateDto["services"]) ??
          existing.services.map((line) => ({
            serviceProfileId: line.serviceProfileId,
            professionalProfileIds: line.professionals.map(
              (person) => person.professionalProfileId,
            ),
            resourceIds: line.resources.map((entry) => entry.resourceId),
          })),
      };
    const item = buildDesignAppointment(state, input, existing);
    if (action === "move" && existing) item.status = existing.status;
    checkAppointmentAvailability(state, item, existing?.id);
    if (existing) Object.assign(existing, item);
    else state.appointments.push(item);
    return item;
  }
  if (resource === "blocks") {
    if (method === "GET")
      return state.blocks.filter(
        (item) =>
          designBootstrap(state).authorizedBranchIds.includes(item.branchId) &&
          (!query.get("branchId") || item.branchId === query.get("branchId")) &&
          item.startsAt < (query.get("to") ?? "9999") &&
          item.endsAt > (query.get("from") ?? ""),
      );
    const existing = id
      ? state.blocks.find((item) => item.id === id)
      : undefined;
    if (id && !existing) fail(404, "Bloqueo no encontrado.");
    if (existing) {
      inScope(state, existing.branchId);
      versionGuard(existing, body);
    }
    if (action === "cancel") {
      existing!.status = "CANCELED";
      existing!.version += 1;
      existing!.canceledAt = new Date().toISOString();
      return existing;
    }
    return patchCollection(
      rows(state.blocks),
      {
        professionalProfileId: null,
        resourceId: null,
        status: "ACTIVE",
        timezone: "America/Mexico_City",
        branchProfileId: state.catalog.branches.find(
          (item) => item.branchId === body.branchId,
        )?.id,
        canceledAt: null,
        createdAt: new Date().toISOString(),
        ...body,
      },
      id,
    );
  }
  if (resource === "clients") {
    if (id === "sources") return state.sources;
    if (id === "search")
      return page(
        visibleCustomers(state).filter(
          (item) =>
            item.active &&
            (!query.get("branchId") ||
              item.currentPortfolios.some(
                (portfolio) => portfolio.branchId === query.get("branchId"),
              )) &&
            (!query.get("sourceId") ||
              item.source?.id === query.get("sourceId")) &&
            [item.displayName, item.phone, item.email, ...item.aliases].some(
              (value) => textKey(value).includes(textKey(query.get("query"))),
            ),
        ),
        query,
      );
    if (id === "field-definitions") {
      if (method === "GET") return state.fields;
      if (state.controls.role !== "master")
        fail(403, "Los campos requieren master demo.");
      const input = body as unknown as SchedulerCustomerFieldDefinitionWriteDto;
      return patchCollection(
        rows(state.fields),
        { options: null, required: false, active: true, ...input },
        action,
      );
    }
    if (id === "merge") {
      consumeAuthorization(state, body.authorizationToken, "CLIENT_MERGE");
      const source = customer(state, String(body.sourceCustomerId)),
        target = customer(state, String(body.targetCustomerId));
      if (source.id === target.id)
        fail(400, "Selecciona dos clientes distintos.");
      versionGuard(source, { expectedVersion: body.expectedSourceVersion });
      versionGuard(target, { expectedVersion: body.expectedTargetVersion });
      source.active = false;
      source.version += 1;
      source.phone = null;
      target.aliases.push(source.displayName);
      target.version += 1;
      target.mergeHistory.push({
        id: designId("design-merge"),
        sourceCustomerId: source.id,
        targetCustomerId: target.id,
        reason: String(body.reason ?? ""),
        createdAt: new Date().toISOString(),
      });
      state.appointments
        .filter((item) => item.customerId === source.id)
        .forEach((item) => {
          item.customerId = target.id;
          item.customerName = target.displayName;
        });
      return {
        mergeEventId: target.mergeHistory.at(-1)!.id,
        sourceCustomerId: source.id,
        targetCustomerId: target.id,
        targetVersion: target.version,
        reassignedRelations: {
          appointments: state.appointments.filter(
            (item) => item.customerId === target.id,
          ).length,
        },
      };
    }
    if (method === "GET" && id) {
      const item = customer(state, id);
      const masterIdentityEdit =
        state.controls.role === "master" &&
        !action &&
        !headers.get("x-scheduler-authorization");
      if (!masterIdentityEdit) {
        consumeAuthorization(
          state,
          headers.get("x-scheduler-authorization"),
          {
            visits: "CLIENT_VISIT_HISTORY_VIEW",
            financial: "CLIENT_FINANCIAL_HISTORY_VIEW",
          }[action as "visits"] ?? "CLIENT_RECORD_VIEW",
          id,
        );
        if (!action) {
          state.customerEditAccess.set(`${state.controls.accountId}:${id}`, {
            role: state.controls.role,
            expiresAt: Date.now() + 120_000,
          });
        }
      }
      if (action === "visits")
        return {
          ...page(
            visibleAppointments(state)
              .filter((entry) => entry.customerId === id)
              .map((entry) => ({
                id: entry.id,
                origin: "SCHEDULER_APPOINTMENT",
                branchId: entry.branchId,
                branchName: entry.branchName,
                serviceName: entry.services
                  .map((line) => line.serviceName)
                  .join(", "),
                status: entry.status,
                scheduledAt: entry.startsAt,
                createdAt: entry.createdAt,
              })),
            query,
          ),
          legacyRegistroCitaLinked: false,
        };
      if (action === "financial")
        return { ...page([], query), authority: "POS_READ_ONLY" };
      return item;
    }
    if (method === "POST" || method === "PUT") {
      if (method === "PUT" && id && state.controls.role !== "master") {
        const accessKey = `${state.controls.accountId}:${id}`;
        const access = state.customerEditAccess.get(accessKey);
        if (!access || access.expiresAt < Date.now()) {
          fail(
            403,
            "Editar un cliente registrado requiere acceso autorizado o master.",
          );
        }
        state.customerEditAccess.delete(accessKey);
      }
      const input = body as unknown as SchedulerCustomerWriteDto;
      if (!input.displayName?.trim() || !input.branchId)
        fail(400, "Captura nombre y sucursal.");
      const phone = phoneKey(input.phone);
      if (
        phone &&
        state.customers.some(
          (item) =>
            item.active && item.id !== id && phoneKey(item.phone) === phone,
        )
      )
        fail(
          409,
          "El teléfono ya pertenece a otro cliente.",
          "PHONE_DUPLICATE",
        );
      const existing = id ? customer(state, id) : undefined;
      if (existing) versionGuard(existing, body);
      for (const definition of state.fields.filter((field) => field.active)) {
        const value = rows(input.customFields).find(
          (field) => field.definitionId === definition.id,
        )?.value;
        const missing = value === undefined || value === null || value === "";
        if (missing && definition.required)
          fail(400, `Completa el campo ${definition.label}.`);
        if (missing) continue;
        if (
          definition.type === "NUMBER" &&
          (typeof value !== "number" || !Number.isFinite(value))
        )
          fail(400, `${definition.label} debe ser un número.`);
        if (definition.type === "BOOLEAN" && typeof value !== "boolean")
          fail(400, `${definition.label} debe ser sí o no.`);
        if (
          definition.type === "SELECT" &&
          !definition.options?.includes(String(value))
        )
          fail(400, `${definition.label} contiene una opción inválida.`);
        if (
          definition.type === "DATE" &&
          !/^\d{4}-\d{2}-\d{2}$/.test(String(value))
        )
          fail(400, `${definition.label} debe ser una fecha.`);
      }
      const profile = state.catalog.branches.find(
        (branch) => branch.branchId === input.branchId,
      )!;
      const item = {
        id: id ?? designId("design-customer"),
        displayName: input.displayName,
        preferredName: input.profile?.preferredName ?? null,
        phone: phone || null,
        email: input.email ?? null,
        source:
          state.sources.find((entry) => entry.id === input.sourceId) ?? null,
        active: input.active ?? true,
        version: (existing?.version ?? 0) + 1,
        aliases: existing?.aliases ?? [],
        currentPortfolios: existing?.currentPortfolios ?? [
          {
            id: designId("design-portfolio"),
            branchId: input.branchId,
            branchName: profile.branchName,
            employeeId: state.catalog.professionals[0]!.employeeId,
            ownerName: state.catalog.professionals[0]!.name,
            effectiveFrom: new Date().toISOString(),
            effectiveTo: null,
          },
        ],
        notes: input.notes ?? null,
        profile: {
          preferredLocale: input.profile?.preferredLocale ?? "es-MX",
          contactPreference: input.profile?.contactPreference ?? "NONE",
          notes: input.profile?.notes ?? null,
          version: (existing?.profile?.version ?? 0) + 1,
        },
        emails: existing?.emails ?? [],
        mergeHistory: existing?.mergeHistory ?? [],
        customFields: rows(input.customFields).map((field) => {
          const definition =
            state.fields.find((entry) => entry.id === field.definitionId) ??
            fail(400, "Campo no encontrado.");
          return {
            definitionId: definition.id,
            definitionVersion: definition.version,
            key: definition.key,
            label: definition.label,
            type: definition.type,
            value: field.value,
          };
        }),
      };
      if (existing) Object.assign(existing, item);
      else state.customers.push(item);
      state.appointments
        .filter((entry) => entry.customerId === item.id)
        .forEach((entry) => {
          entry.customerName = item.displayName;
        });
      return item;
    }
  }
  if (resource === "administration") {
    if (id === "catalog") return state.administration;
    if (id === "pos-references") return state.posReferences;
    if (id === "settings") {
      const section = action as SchedulerSettingSection;
      if (!SCHEDULER_SETTING_SECTIONS.includes(section))
        fail(404, "Sección no encontrada.");
      const commerce = String(
        body.commerceId ??
          query.get("commerceId") ??
          state.catalog.commerces[0]!.id,
      );
      const branch = String(
        body.branchProfileId ??
          query.get("branchProfileId") ??
          state.catalog.branches[0]!.id,
      );
      const references = {
        COMMERCE: commerce,
        BRANCH: branch,
        USER: `design-${state.controls.accountId}`,
      };
      const scopes: SchedulerSettingScope[] = ["COMMERCE", "BRANCH", "USER"];
      if (method === "GET") {
        const layers = scopes.map((scope) => ({
          scope,
          scopeReferenceId: references[scope],
          ...(state.settingLayers[
            `${section}:${scope}:${references[scope]}`
          ] ?? {
            document: scope === "COMMERCE" ? state.settings[section] : {},
            version: 1,
          }),
        }));
        return {
          section,
          precedence: scopes,
          layers,
          document: Object.assign({}, ...layers.map((layer) => layer.document)),
        };
      }
      const scope = body.scope as SchedulerSettingScope;
      if (!scopes.includes(scope)) fail(400, "Capa inválida.");
      const key = `${section}:${scope}:${references[scope]}`;
      const previous = state.settingLayers[key] ?? {
        version: 1,
        document: scope === "COMMERCE" ? state.settings[section] : {},
      };
      versionGuard(previous, body);
      state.settingLayers[key] = {
        document: record(body.document),
        version: previous.version + 1,
      };
      return { id: key, version: previous.version + 1 };
    }
    if (id === "status-colors") {
      consumeAuthorization(
        state,
        body.authorizationToken,
        "STATUS_COLORS_CHANGE",
      );
      const entry =
        state.administration.statusColors.find(
          (item) => item.commerceId === action,
        ) ?? fail(404, "Comercio no encontrado.");
      entry.colors = rows(body.colors).map((color) => ({
        status: color.status as SchedulerAppointmentStatus,
        color: String(color.color),
        version:
          (entry.colors.find((item) => item.status === color.status)?.version ??
            0) + 1,
      }));
      return entry.colors;
    }
    const collections: Record<string, DesignRow[]> = {
      packages: rows(state.administration.packages),
      addons: rows(state.administration.addons),
      "commission-policies": rows(state.administration.commissionPolicies),
      "gift-cards": rows(state.administration.giftCards),
    };
    if (id === "classes") {
      state.administration.classSchedules =
        state.administration.classSchedules.filter(
          (item) => item.serviceProfileId !== action,
        );
      const created = rows(body.schedules).map((item) => ({
        ...item,
        id: designId("design-class"),
        serviceProfileId: action,
        active: true,
      }));
      state.administration.classSchedules.push(
        ...(created as unknown as typeof state.administration.classSchedules),
      );
      return { ids: created.map((item) => item.id) };
    }
    if (collections[id ?? ""] && isWriting(method))
      return patchCollection(
        collections[id!]!,
        body,
        action ?? String(body.id ?? ""),
        { packages: "posPackageId", addons: "catalogItemId" }[
          id as "packages"
        ] ?? "id",
      );
  }
  if (resource === "reports" || resource === "exports") {
    if (!schedulerReportKeys.includes(id as SchedulerReportKey))
      fail(404, "Dataset no encontrado.");
    if (resource === "exports" && id === "CUSTOMERS")
      consumeAuthorization(
        state,
        headers.get("x-scheduler-authorization"),
        "SENSITIVE_EXPORT",
      );
    return buildReport(
      state,
      id as SchedulerReportKey,
      query,
      resource === "exports",
    );
  }
  if (resource === "communications") {
    if (id === "templates")
      return method === "GET"
        ? state.messageTemplates
        : patchCollection(state.messageTemplates, body, action);
    if (id === "outbox") {
      if (method === "GET") return state.messageOutbox;
      if (parts[5] === "retry") {
        const entry =
          state.messageOutbox.find((item) => item.id === action) ??
          fail(404, "Mensaje no encontrado.");
        entry.status = "QUEUED";
        return entry;
      }
      const customerEntry = customer(state, String(body.customerId));
      const template =
        state.messageTemplates.find((item) => item.id === body.templateId) ??
        fail(404, "Plantilla no encontrada.");
      return patchCollection(state.messageOutbox, {
        ...body,
        channel: template.channel,
        templateName: template.name,
        templateVersion: template.currentVersion,
        customerName: customerEntry.displayName,
        branchName: state.catalog.branches[0]!.branchName,
        status: "QUEUED",
        attempts: 0,
        lastErrorCode: null,
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        createdAt: new Date().toISOString(),
      });
    }
    if (id === "customers") {
      customer(state, action!);
      const channels = state.contactChannels[action!] ?? [
        {
          customerId: action,
          channel: "WHATSAPP",
          status: "OPTED_IN",
          available: true,
          verifiedAt: null,
          consentedAt: null,
          version: 1,
        },
      ];
      state.contactChannels[action!] = channels;
      return method === "GET"
        ? channels
        : patchCollection(channels, body, String(body.channel), "channel");
    }
  }
  if (resource === "surveys")
    return method === "GET"
      ? state.surveys
      : patchCollection(state.surveys, body, id);
  if (resource === "documents") {
    if (id === "consent-templates")
      return method === "GET"
        ? state.consentTemplates
        : patchCollection(
            state.consentTemplates,
            {
              ...body,
              commerceId: state.catalog.commerces[0]!.id,
              active: true,
              document: {
                id: designId("design-document"),
                version: 1,
                fileName: body.fileName ?? "documento-demo.pdf",
                mimeType: "application/pdf",
                sizeBytes: 0,
                sha256: "design-only",
                createdAt: new Date().toISOString(),
              },
            },
            action,
          );
    if (id === "consent-records")
      return method === "GET"
        ? state.consentRecords
        : patchCollection(
            state.consentRecords,
            {
              ...body,
              status: body.status ?? "ASSIGNED",
              signedAt: null,
              revokedAt: null,
              templateName: "Consentimiento demo",
              branchName: state.catalog.branches[0]!.branchName,
            },
            action,
          );
    if (id === "customers")
      return method === "GET"
        ? state.documents.filter((item) => item.customerId === action)
        : patchCollection(state.documents, {
            ...body,
            customerId: action,
            fileName: body.fileName ?? "documento-demo.pdf",
            sha256: "design-only",
            createdAt: new Date().toISOString(),
          });
    if (parts[5] === "signed-url" || (action && parts[4] === "signed-url"))
      return { url: "/logo.svg", expiresInSeconds: 300 };
  }
  if (resource === "medical-records") {
    customer(state, id!);
    const existing = state.medicalRecords[id!] ?? {
      customerId: id,
      commerceId: query.get("commerceId"),
      fields: {},
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    if (method === "GET") return existing;
    versionGuard(existing, body);
    state.medicalRecords[id!] = {
      ...existing,
      fields: record(body.fields),
      version: Number(existing.version) + 1,
    };
    return state.medicalRecords[id!];
  }
  if (resource === "access")
    return {
      screens: designBootstrap(state).permissions.map((item) => item.screenKey),
      capabilities: ["READ", "WRITE", "ADMIN", "EXPORT", "EXCEPTION"],
      branches: designBootstrap(state).authorizedBranches,
      positions: [],
    };
  fail(
    501,
    `Falta implementar el mock de ${method} ${path}.`,
    "DESIGN_ENDPOINT_MISSING",
  );
}

export function handleDesignRequest(
  state: DesignState,
  request: DesignRequest,
): DesignReply {
  try {
    authorizeRequest(state, request);
    const dataRoute =
      !["/api/auth/login", "/api/scheduler/bootstrap"].includes(
        request.url.pathname,
      ) &&
      !request.url.pathname.includes("/authorizations") &&
      !request.url.pathname.includes("/design-proposals");
    if (dataRoute && state.controls.scenario === "error")
      fail(
        503,
        "Error de ejemplo. Cambia el escenario para reintentar.",
        "DESIGN_SIMULATED_ERROR",
      );
    if (
      isWriting(request.method) &&
      dataRoute &&
      state.controls.scenario === "conflict"
    )
      fail(
        409,
        "Conflicto de ejemplo: otro usuario modificó el registro.",
        "VERSION_CONFLICT",
      );
    const idempotencyKey = request.headers.get("idempotency-key");
    const payload = JSON.stringify({
      path: request.url.pathname,
      body: request.body,
    });
    if (idempotencyKey && state.idempotency.has(idempotencyKey)) {
      const previous = state.idempotency.get(idempotencyKey)!;
      if (previous.payload !== payload)
        fail(
          409,
          "La clave demo ya se usó para otra operación.",
          "IDEMPOTENCY_CONFLICT",
        );
      return { status: 200, body: { success: true, data: previous.result } };
    }
    const result = dispatch(state, request);
    if (idempotencyKey)
      state.idempotency.set(idempotencyKey, {
        payload,
        result: structuredClone(result),
      });
    const guardedWrite =
      request.url.pathname.startsWith("/api/scheduler/appointments") ||
      request.url.pathname.startsWith("/api/scheduler/blocks");
    if (
      dataRoute &&
      !guardedWrite &&
      (isWriting(request.method) || request.url.pathname.includes("/exports/"))
    ) {
      state.movements.unshift({
        id: designId("design-movement"),
        actorId: designBootstrap(state).user.id,
        actor: designBootstrap(state).user.name,
        actorRole: designBootstrap(state).user.positionName ?? "Sesión",
        actorSource: "SESSION",
        action: `${request.method} ${request.url.pathname}`,
        purpose: "SYSTEM_WRITE",
        targetType:
          request.url.pathname.split("/").filter(Boolean)[2] ?? "record",
        targetId: String(record(result).id ?? ""),
        createdAt: new Date().toISOString(),
        metadata: {},
      });
    }
    return {
      status: request.method === "POST" ? 201 : 200,
      body: { success: true, data: result },
    };
  } catch (error) {
    const status = error instanceof DesignApiError ? error.status : 400;
    return {
      status,
      body: {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo simular la operación.",
        code:
          error instanceof DesignApiError ? error.code : "DESIGN_INVALID_INPUT",
      },
    };
  }
}
