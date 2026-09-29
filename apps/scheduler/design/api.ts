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
  designBootstrap,
  designId,
  designInstant,
  type DesignRow,
  type DesignState,
} from "./store";
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
    auth.role !== state.controls.role ||
    auth.expiresAt < Date.now() ||
    (purpose && auth.purpose !== purpose) ||
    (targetId && auth.targetId && auth.targetId !== targetId)
  ) {
    fail(403, "Autorización demo inválida o vencida.");
  }
  state.authorizations.delete(key);
}
function authorizeRequest(state: DesignState, request: DesignRequest) {
  const path = request.url.pathname;
  if (path === "/api/auth/login") return;
  if (
    request.headers.get("authorization") !==
    `Bearer design-token-${state.controls.role}`
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

function dispatch(state: DesignState, request: DesignRequest): unknown {
  const { body, url, headers, method } = request;
  const path = url.pathname,
    query = url.searchParams,
    parts = path.split("/").filter(Boolean);
  const resource = parts[2],
    id = parts[3],
    action = parts[4];
  if (path === "/api/auth/login") {
    const roles = {
      "master@example.test": "master",
      "specialist@example.test": "specialist",
      "read-only@example.test": "read-only",
    } as const;
    if (body.password !== "demo" || !(String(body.email) in roles))
      fail(401, "Usa una cuenta demo y la contraseña demo.");
    state.controls.role = roles[String(body.email) as keyof typeof roles];
    return { token: `design-token-${state.controls.role}` };
  }
  if (resource === "bootstrap") return designBootstrap(state);
  if (resource === "security") return { updated: true };
  if (resource === "authorizations") {
    if (id === "consume") {
      consumeAuthorization(state, body.token, String(body.purpose));
      return { consumed: true };
    }
    const codes = { master: "0000", specialist: "1111", "read-only": "2222" };
    if (body.secret !== codes[state.controls.role])
      fail(403, "Código demo incorrecto.");
    if (
      state.controls.role === "read-only" &&
      !String(body.purpose).endsWith("_VIEW")
    )
      fail(403, "El perfil de consulta no autoriza modificaciones.");
    const token = designId("design-authorization"),
      expiresAt = Date.now() + 120_000;
    state.authorizations.set(token, {
      role: state.controls.role,
      purpose: String(body.purpose),
      targetId: String(body.targetId ?? ""),
      expiresAt,
    });
    return {
      token,
      purpose: body.purpose,
      expiresAt: new Date(expiresAt).toISOString(),
      actor: {
        userId: `design-${state.controls.role}`,
        name: designBootstrap(state).user.name,
      },
    };
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
      consumeAuthorization(
        state,
        headers.get("x-scheduler-authorization"),
        {
          visits: "CLIENT_VISIT_HISTORY_VIEW",
          financial: "CLIENT_FINANCIAL_HISTORY_VIEW",
        }[action as "visits"] ?? "CLIENT_RECORD_VIEW",
        id,
      );
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
        USER: `design-${state.controls.role}`,
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
      ) && !request.url.pathname.includes("/authorizations");
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
    if (
      dataRoute &&
      (isWriting(request.method) || request.url.pathname.includes("/exports/"))
    ) {
      state.movements.unshift({
        id: designId("design-movement"),
        actor: designBootstrap(state).user.name,
        action: `${request.method} ${request.url.pathname}`,
        targetId: String(record(result).id ?? ""),
        createdAt: new Date().toISOString(),
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
