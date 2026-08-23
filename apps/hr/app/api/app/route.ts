import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  brandSettings,
  branches,
  dailyAssignments,
  employeeSessions,
  jobRoles,
  permissionTypes,
  policyDocuments,
  requests,
  staff,
  vacationModels,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import {
  fullPermissions,
  parsePermissions,
  serializePermissions,
  type PermissionKey,
} from "../../access-permissions";

type AccessMember = { isAdmin: boolean; permissions: string };

function canAccess(
  member: AccessMember,
  module: PermissionKey,
  level: "view" | "edit",
) {
  if (member.isAdmin) return true;
  return parsePermissions(member.permissions)[module][level];
}

function permissionDenied() {
  return Response.json(
    { error: "No tienes permiso para realizar esta acción" },
    { status: 403 },
  );
}

async function ensureBranding() {
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS brand_settings (
    id integer PRIMARY KEY NOT NULL,
    brand_name text DEFAULT 'KEYSAR' NOT NULL,
    brand_subtitle text DEFAULT 'COSMETICS · GESTIÓN DE PERSONAL' NOT NULL,
    logo_key text,
    logo_name text,
    logo_content_type text,
    updated_at text NOT NULL
  )`,
  ).run();
  const db = await getDb();
  const existing = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.id, 1),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(brandSettings)
    .values({
      id: 1,
      brandName: "KEYSAR",
      brandSubtitle: "COSMETICS · GESTIÓN DE PERSONAL",
      updatedAt: new Date().toISOString(),
    })
    .returning();
  return created;
}

function publicBranding(settings: typeof brandSettings.$inferSelect) {
  return {
    brandName: settings.brandName,
    brandSubtitle: settings.brandSubtitle,
    logoName: settings.logoName,
    logoUrl: settings.logoKey
      ? `/api/app?brandLogo=1&v=${encodeURIComponent(settings.updatedAt)}`
      : null,
  };
}

async function ensureOperationalSchema() {
  const { env } = await import("cloudflare:workers");
  const statements = [
    `CREATE TABLE IF NOT EXISTS vacation_models (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, name text NOT NULL UNIQUE, period_type text NOT NULL, total_days integer NOT NULL, created_at text NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS policy_documents (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, title text NOT NULL, category text NOT NULL, file_key text NOT NULL, file_name text NOT NULL, content_type text NOT NULL, created_at text NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS job_roles (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, name text NOT NULL UNIQUE, active integer DEFAULT true NOT NULL, created_at text NOT NULL)`,
    `ALTER TABLE branches ADD COLUMN opening_time text DEFAULT '10:00' NOT NULL`,
    `ALTER TABLE branches ADD COLUMN closing_time text DEFAULT '20:00' NOT NULL`,
    `ALTER TABLE staff ADD COLUMN vacation_model_id integer`,
    `ALTER TABLE requests ADD COLUMN vacation_model_id integer`,
    `ALTER TABLE staff ADD COLUMN birthday text`,
  ];
  for (const statement of statements) {
    try {
      await env.DB.prepare(statement).run();
    } catch {
      /* Column already exists. */
    }
  }
  const db = await getDb();
  const current = await db.select().from(vacationModels).limit(1);
  if (!current.length)
    await db.insert(vacationModels).values([
      {
        name: "Periodo básico · 7 días",
        periodType: "periodo",
        totalDays: 7,
        createdAt: new Date().toISOString(),
      },
      {
        name: "Semana completa · 14 días",
        periodType: "semanas",
        totalDays: 14,
        createdAt: new Date().toISOString(),
      },
      {
        name: "Mes completo · 30 días",
        periodType: "mes",
        totalDays: 30,
        createdAt: new Date().toISOString(),
      },
    ]);
  const currentRoles = await db.select().from(jobRoles);
  if (!currentRoles.length)
    await db.insert(jobRoles).values(
      [
        "Vendedor",
        "Facialista",
        "Recepción",
        "Gerente",
        "Supervisor",
        "Master",
        "Sin puesto",
      ].map((name) => ({
        name,
        active: true,
        createdAt: new Date().toISOString(),
      })),
    );
  else if (!currentRoles.some((role) => role.name === "Master"))
    await db
      .insert(jobRoles)
      .values({
        name: "Master",
        active: true,
        createdAt: new Date().toISOString(),
      });
  await db
    .update(staff)
    .set({
      jobRole: "Master",
      permissions: serializePermissions(fullPermissions()),
    })
    .where(eq(staff.isAdmin, true));
}

function inclusiveDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`),
    end = new Date(`${endDate}T12:00:00`);
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  );
}

const spanishWeekDays = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function isConfiguredRestDay(
  member: typeof staff.$inferSelect,
  workDate: string,
) {
  const day = spanishWeekDays[new Date(`${workDate}T12:00:00`).getDay()];
  const matches = day === member.restDay || day === member.restDay2;
  if (!matches) return false;
  if (member.restType !== "Temporal") return true;
  return Boolean(
    member.restStartDate &&
      member.restEndDate &&
      workDate >= member.restStartDate &&
      workDate <= member.restEndDate,
  );
}

function shiftWindow(value: string) {
  const match = value.match(/(\d{2}:\d{2})[–-](\d{2}:\d{2})/);
  return match ? { start: match[1], end: match[2] } : null;
}

async function validateBranchHours(branchName: string, shift: string) {
  if (branchName === "Sin asignar" || shift === "Sin asignar") return;
  const db = await getDb();
  const branch = await db.query.branches.findFirst({
    where: eq(branches.name, branchName),
  });
  const window = shiftWindow(shift);
  if (
    branch &&
    window &&
    (window.start < branch.openingTime || window.end > branch.closingTime)
  )
    throw new Error(
      `El turno debe quedar dentro del horario de ${branch.openingTime} a ${branch.closingTime}`,
    );
}

async function vacationModelForRequest(
  member: typeof staff.$inferSelect,
  requestType: string,
  startDate: string,
  endDate: string,
) {
  if (!requestType.toLowerCase().includes("vacaci")) return null;
  if (!member.vacationModelId)
    throw new Error(
      "Debes tener un modelo de vacaciones asignado antes de solicitar vacaciones",
    );
  const db = await getDb();
  const model = await db.query.vacationModels.findFirst({
    where: eq(vacationModels.id, member.vacationModelId),
  });
  if (!model)
    throw new Error("El modelo de vacaciones asignado ya no está disponible");
  const history = await db
    .select()
    .from(requests)
    .where(eq(requests.staffId, member.id));
  const committed = history
    .filter(
      (item) =>
        item.requestType.toLowerCase().includes("vacaci") &&
        item.status !== "No autorizado",
    )
    .reduce(
      (total, item) => total + inclusiveDays(item.startDate, item.endDate),
      0,
    );
  const requested = inclusiveDays(startDate, endDate);
  if (committed + requested > model.totalDays)
    throw new Error(
      `La solicitud supera tu saldo disponible de ${Math.max(0, model.totalDays - committed)} días`,
    );
  return model.id;
}

async function sha(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  const match = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}
function sessionCookie(
  token: string,
  request: Request,
  maxAge = 60 * 60 * 24 * 30,
) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `keysar_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}
function usernamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
async function uniqueUsername(firstName: string, paternalSurname: string) {
  const db = await getDb();
  const first = usernamePart(firstName);
  const paternal = usernamePart(paternalSurname);
  const base =
    `${first.slice(0, 1)}${paternal.slice(0, 4)}` ||
    `emp${String(Date.now()).slice(-4)}`;
  let candidate = base;
  let suffix = 1;
  while (
    await db.query.staff.findFirst({ where: eq(staff.username, candidate) })
  )
    candidate = `${base}${++suffix}`;
  return candidate;
}
async function createEmployee(
  input: Record<string, unknown>,
  allowMaster = false,
) {
  const db = await getDb();
  const invitedEmail = String(input.invitedEmail || "")
    .trim()
    .toLowerCase();
  const firstName = String(input.firstName || "").trim();
  const paternalSurname = String(input.paternalSurname || "").trim();
  const maternalSurname = String(input.maternalSurname || "").trim();
  if (!firstName || !paternalSurname || !maternalSurname)
    throw new Error("Faltan nombre o apellidos");
  if (invitedEmail) {
    const existing = await db.query.staff.findFirst({
      where: or(
        eq(staff.invitedEmail, invitedEmail),
        eq(staff.email, invitedEmail),
      ),
    });
    if (existing) throw new Error("El correo de contacto ya está registrado");
  }
  const username = await uniqueUsername(firstName, paternalSurname);
  const code = `KEY-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const fullName = `${firstName} ${paternalSurname} ${maternalSurname}`.replace(
    /\s+/g,
    " ",
  );
  const requestedRole = String(input.jobRole || "Vendedor");
  const requestedMaster = requestedRole === "Master";
  if (requestedMaster && !allowMaster)
    throw new Error("Sólo un usuario Master puede asignar este puesto");
  const [created] = await db
    .insert(staff)
    .values({
      name: fullName,
      firstName,
      paternalSurname,
      maternalSurname,
      username,
      jobRole: requestedRole,
      invitedEmail: invitedEmail || null,
      accessCodeHash: await sha(code),
      vacationModelId: input.vacationModelId
        ? Number(input.vacationModelId)
        : null,
      branch: String(input.branch || "Sin asignar"),
      shift: String(input.shift || "Sin asignar"),
      restDay: String(input.restDay || "Sin asignar"),
      restDay2: String(input.restDay2 || "Sin asignar"),
      restType: String(input.restType || "Fijo"),
      restStartDate: input.restStartDate ? String(input.restStartDate) : null,
      restEndDate: input.restEndDate ? String(input.restEndDate) : null,
      isActive: true,
      isAdmin: requestedMaster,
      permissions: requestedMaster
        ? serializePermissions(fullPermissions())
        : "{}",
      createdAt: new Date().toISOString(),
    })
    .returning();
  return {
    created: { id: created.id, name: created.name, invitedEmail, username },
    temporaryPassword: code,
  };
}
async function ensureUsernames() {
  const db = await getDb();
  const pending = await db
    .select()
    .from(staff)
    .where(and(isNull(staff.username), eq(staff.isAdmin, false)));
  for (const member of pending) {
    const parts = member.name.trim().split(/\s+/);
    const firstName = member.firstName || parts[0] || "empleado";
    const paternalSurname =
      member.paternalSurname || parts[1] || String(member.id);
    const maternalSurname =
      member.maternalSurname || parts.slice(2).join(" ") || "";
    const username = await uniqueUsername(firstName, paternalSurname);
    await db
      .update(staff)
      .set({ firstName, paternalSurname, maternalSurname, username })
      .where(eq(staff.id, member.id));
  }
}
async function ensureMasterAccount<T extends typeof staff.$inferSelect>(
  member: T,
) {
  if (!member.isAdmin) return member;
  const db = await getDb();
  let username = member.username || "master";
  const collision = await db.query.staff.findFirst({
    where: eq(staff.username, username),
  });
  if (collision && collision.id !== member.id) username = `master${member.id}`;
  const [updated] = await db
    .update(staff)
    .set({
      username,
      jobRole: "Master",
      permissions: serializePermissions(fullPermissions()),
      isActive: true,
    })
    .where(eq(staff.id, member.id))
    .returning();
  return updated || member;
}
async function session(request: Request) {
  const db = await getDb();
  const localToken = cookieValue(request, "keysar_session");
  if (localToken) {
    const tokenHash = await sha(localToken);
    const local = await db.query.employeeSessions.findFirst({
      where: eq(employeeSessions.tokenHash, tokenHash),
    });
    if (local && local.expiresAt > new Date().toISOString()) {
      const localMember = await db.query.staff.findFirst({
        where: eq(staff.id, local.staffId),
      });
      if (localMember) {
        const normalized = await ensureMasterAccount(localMember);
        return {
          identity: {
            displayName: normalized.name,
            email: normalized.email || normalized.invitedEmail || "",
          },
          member: normalized,
        };
      }
    }
    if (local)
      await db
        .delete(employeeSessions)
        .where(eq(employeeSessions.id, local.id));
  }
  const identity = await getChatGPTUser();
  if (!identity) return { identity: null, member: null };
  await ensureUsernames();
  let member = await db.query.staff.findFirst({
    where: eq(staff.email, identity.email.toLowerCase()),
  });
  const all = await db.select({ id: staff.id }).from(staff).limit(1);
  if (!all.length) {
    [member] = await db
      .insert(staff)
      .values({
        name: identity.displayName,
        username: "master",
        jobRole: "Master",
        email: identity.email.toLowerCase(),
        permissions: serializePermissions(fullPermissions()),
        isAdmin: true,
        createdAt: new Date().toISOString(),
      })
      .returning();
  } else if (member?.isAdmin) {
    member = await ensureMasterAccount(member);
  }
  return { identity, member: member ?? null };
}
export async function GET(request: Request) {
  await ensureOperationalSchema();
  const db = await getDb();
  const url = new URL(request.url);
  const branding = await ensureBranding();
  if (url.searchParams.get("brandLogo")) {
    if (!branding.logoKey)
      return new Response("Logotipo no configurado", { status: 404 });
    const { env } = await import("cloudflare:workers");
    const object = await env.BUCKET.get(branding.logoKey);
    if (!object) return new Response("Logotipo no encontrado", { status: 404 });
    return new Response(object.body, {
      headers: {
        "content-type":
          branding.logoContentType ||
          object.httpMetadata?.contentType ||
          "image/png",
        "cache-control": "public, max-age=3600",
        "content-disposition": `inline; filename="${branding.logoName || "logotipo"}"`,
      },
    });
  }
  const { member } = await session(request);
  if (!member)
    return Response.json({
      session: { name: "", email: "", status: "unlinked" },
      branding: publicBranding(branding),
      staff: [],
      branches: [],
      requests: [],
      calendarAbsences: [],
      assignments: [],
      permissionTypes: [],
      policyDocuments: [],
      vacationModels: [],
      jobRoles: [],
      birthdays: [],
    });
  const attachment = url.searchParams.get("attachment");
  if (attachment) {
    const record = await db.query.requests.findFirst({
      where: eq(requests.attachmentKey, attachment),
    });
    const isVacation = record?.requestType.toLowerCase().includes("vacaci");
    if (
      !record ||
      (!member.isAdmin && isVacation && record.staffId !== member.id) ||
      (!canAccess(member, "requests", "view") &&
        !canAccess(member, "vacations", "view") &&
        record.staffId !== member.id)
    )
      return new Response("No autorizado", { status: 403 });
    const { env } = await import("cloudflare:workers");
    const object = await env.BUCKET.get(attachment);
    if (!object) return new Response("Archivo no encontrado", { status: 404 });
    return new Response(object.body, {
      headers: {
        "content-type":
          object.httpMetadata?.contentType || "application/octet-stream",
        "content-disposition": `attachment; filename="${record.attachmentName || "comprobante"}"`,
      },
    });
  }
  const documentId = Number(url.searchParams.get("document") || 0);
  if (documentId) {
    if (!canAccess(member, "policies", "view"))
      return new Response("No autorizado", { status: 403 });
    const record = await db.query.policyDocuments.findFirst({
      where: eq(policyDocuments.id, documentId),
    });
    if (!record)
      return new Response("Documento no encontrado", { status: 404 });
    const { env } = await import("cloudflare:workers");
    const object = await env.BUCKET.get(record.fileKey);
    if (!object) return new Response("Archivo no encontrado", { status: 404 });
    return new Response(object.body, {
      headers: {
        "content-type": record.contentType,
        "content-disposition": `inline; filename="${record.fileName}"`,
      },
    });
  }
  const teamAccess =
    member.isAdmin ||
    (
      [
        "employees",
        "personal",
        "calendar",
        "requests",
        "vacations",
        "branches",
        "positions",
        "facialists",
      ] as PermissionKey[]
    ).some((module) => canAccess(member, module, "view"));
  const rows = teamAccess ? await db.select().from(staff) : [member];
  const branchRows = await db.select().from(branches);
  let requestRows =
    canAccess(member, "requests", "view") ||
    canAccess(member, "vacations", "view")
      ? await db.select().from(requests).orderBy(desc(requests.createdAt))
      : await db
          .select()
          .from(requests)
          .where(eq(requests.staffId, member.id))
          .orderBy(desc(requests.createdAt));
  if (!member.isAdmin)
    requestRows = requestRows.filter(
      (row) =>
        !row.requestType.toLowerCase().includes("vacaci") ||
        row.staffId === member.id,
    );
  const facialistViewer = member.jobRole
    .toLowerCase()
    .includes("facialista");
  const assignmentRows = facialistViewer
    ? await db
        .select()
        .from(dailyAssignments)
        .where(eq(dailyAssignments.staffId, member.id))
    : canAccess(member, "calendar", "view") ||
        canAccess(member, "facialists", "view")
      ? await db.select().from(dailyAssignments)
      : await db
          .select()
          .from(dailyAssignments)
          .where(eq(dailyAssignments.staffId, member.id));
  const calendarAbsences = canAccess(member, "calendar", "view")
    ? (
        await db
          .select({
            id: requests.id,
            staffId: requests.staffId,
            requestType: requests.requestType,
            startDate: requests.startDate,
            endDate: requests.endDate,
            status: requests.status,
          })
          .from(requests)
      ).filter(
        (row) =>
          row.status === "Autorizado" &&
          (!facialistViewer || row.staffId === member.id),
      )
    : [];
  const permissionRows = await db.select().from(permissionTypes);
  const documentRows = canAccess(member, "policies", "view")
    ? await db
        .select()
        .from(policyDocuments)
        .orderBy(desc(policyDocuments.createdAt))
    : [];
  const vacationModelRows = await db
    .select()
    .from(vacationModels)
    .orderBy(vacationModels.totalDays);
  const roleRows = await db.select().from(jobRoles).orderBy(jobRoles.name);
  const profileAccess =
    member.isAdmin ||
    canAccess(member, "employees", "view") ||
    canAccess(member, "personal", "view");
  const staffRows = profileAccess
    ? rows.map(({ accessCodeHash, ...row }) => row)
    : rows.map((row) => ({
        id: row.id,
        name: row.name,
        jobRole: row.jobRole,
        branch: row.branch,
        shift: row.shift,
        restDay: row.restDay,
        restDay2: row.restDay2,
        restType: row.restType,
        restStartDate: row.restStartDate,
        restEndDate: row.restEndDate,
        isActive: row.isActive,
        isAdmin: row.isAdmin,
        vacationModelId: row.id === member.id ? row.vacationModelId : null,
      }));
  const birthdayRows = canAccess(member, "birthdays", "view")
    ? (
        await db
          .select({
            id: staff.id,
            name: staff.name,
            birthday: staff.birthday,
            branch: staff.branch,
          })
          .from(staff)
          .where(eq(staff.isActive, true))
      )
        .filter((row) => row.birthday)
        .map((row) => ({ ...row, birthday: String(row.birthday).slice(5) }))
    : [];
  return Response.json({
    session: {
      id: member.id,
      name: member.name,
      email: member.email,
      username: member.username,
      role: member.jobRole,
      birthday: member.birthday,
      permissions: member.permissions,
      isAdmin: member.isAdmin,
      status: !member.isAdmin && !member.isActive ? "inactive" : "active",
    },
    branding: publicBranding(branding),
    staff: staffRows,
    branches: branchRows,
    requests: requestRows,
    calendarAbsences,
    assignments: assignmentRows,
    permissionTypes: permissionRows,
    policyDocuments: documentRows.map(({ fileKey, ...row }) => row),
    vacationModels: vacationModelRows,
    jobRoles: roleRows,
    birthdays: birthdayRows,
  });
}
export async function POST(request: Request) {
  await ensureOperationalSchema();
  const contentType = request.headers.get("content-type") || "";
  let body: Record<string, unknown> = {};
  if (!contentType.includes("multipart/form-data")) {
    body = (await request.json()) as Record<string, unknown>;
    if (body.action === "claim") {
      const db = await getDb();
      const submittedUsername = String(body.username || "")
        .trim()
        .toLowerCase();
      const submittedPassword = String(body.code || "")
        .trim()
        .toUpperCase();
      if (!submittedUsername || !submittedPassword)
        return Response.json(
          { error: "Captura tu usuario y contraseña" },
          { status: 400 },
        );
      const codeHash = await sha(submittedPassword);
      const employee = await db.query.staff.findFirst({
        where: and(
          eq(staff.username, submittedUsername),
          eq(staff.accessCodeHash, codeHash),
        ),
      });
      if (!employee || !employee.isActive)
        return Response.json(
          { error: "Usuario o contraseña incorrectos" },
          { status: 400 },
        );
      const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const now = new Date(),
        expires = new Date(now.getTime() + 30 * 86400000);
      await db.insert(employeeSessions).values({
        staffId: employee.id,
        tokenHash: await sha(token),
        expiresAt: expires.toISOString(),
        createdAt: now.toISOString(),
      });
      return Response.json(
        { ok: true },
        { headers: { "Set-Cookie": sessionCookie(token, request) } },
      );
    }
    if (body.action === "logout") {
      const token = cookieValue(request, "keysar_session");
      if (token) {
        const db = await getDb();
        await db
          .delete(employeeSessions)
          .where(eq(employeeSessions.tokenHash, await sha(token)));
      }
      return Response.json(
        { ok: true },
        { headers: { "Set-Cookie": sessionCookie("", request, 0) } },
      );
    }
  }
  const { member } = await session(request);
  if (!member)
    return Response.json({ error: "No autenticado" }, { status: 401 });
  if (member && !member.isAdmin && !member.isActive)
    return Response.json({ error: "La cuenta está inactiva" }, { status: 403 });
  const db = await getDb();
  if (contentType.includes("multipart/form-data")) {
    if (!member)
      return Response.json({ error: "No autenticado" }, { status: 401 });
    const form = await request.formData();
    if (String(form.get("action") || "") === "policy_document_upload") {
      if (!canAccess(member, "policies", "edit")) return permissionDenied();
      const title = String(form.get("title") || "")
        .trim()
        .slice(0, 120);
      const category = String(form.get("category") || "Reglamento")
        .trim()
        .slice(0, 60);
      const file = form.get("document");
      if (!title || !(file instanceof File && file.size))
        return Response.json(
          { error: "Captura el título y selecciona un documento" },
          { status: 400 },
        );
      if (file.size > 15 * 1024 * 1024)
        return Response.json(
          { error: "El documento debe pesar menos de 15 MB" },
          { status: 400 },
        );
      const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (!allowed.includes(file.type))
        return Response.json(
          { error: "Formato no permitido. Usa PDF, Word, Excel, JPG o PNG" },
          { status: 400 },
        );
      const fileKey = `policies/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { env } = await import("cloudflare:workers");
      await env.BUCKET.put(fileKey, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      const [created] = await db
        .insert(policyDocuments)
        .values({
          title,
          category,
          fileKey,
          fileName: file.name,
          contentType: file.type,
          createdAt: new Date().toISOString(),
        })
        .returning();
      return Response.json({ created });
    }
    if (String(form.get("action") || "") === "branding_update") {
      if (!member.isAdmin) return permissionDenied();
      const brandName = String(form.get("brandName") || "")
        .trim()
        .slice(0, 60);
      const brandSubtitle = String(form.get("brandSubtitle") || "")
        .trim()
        .slice(0, 100);
      const file = form.get("logo");
      if (!brandName || !brandSubtitle)
        return Response.json(
          { error: "Captura ambos nombres de la marca" },
          { status: 400 },
        );
      const current = await ensureBranding();
      const update: Partial<typeof brandSettings.$inferInsert> = {
        brandName,
        brandSubtitle,
        updatedAt: new Date().toISOString(),
      };
      if (file instanceof File && file.size) {
        if (!(["image/jpeg", "image/png"] as string[]).includes(file.type))
          return Response.json(
            { error: "El logotipo debe ser JPG o PNG" },
            { status: 400 },
          );
        if (file.size > 4 * 1024 * 1024)
          return Response.json(
            { error: "El logotipo debe pesar menos de 4 MB" },
            { status: 400 },
          );
        const extension = file.type === "image/png" ? "png" : "jpg";
        const logoKey = `branding/logo-${crypto.randomUUID()}.${extension}`;
        const { env } = await import("cloudflare:workers");
        await env.BUCKET.put(logoKey, file.stream(), {
          httpMetadata: { contentType: file.type },
        });
        update.logoKey = logoKey;
        update.logoName = file.name;
        update.logoContentType = file.type;
      } else {
        update.logoKey = current.logoKey;
        update.logoName = current.logoName;
        update.logoContentType = current.logoContentType;
      }
      const [saved] = await db
        .update(brandSettings)
        .set(update)
        .where(eq(brandSettings.id, 1))
        .returning();
      return Response.json({ ok: true, branding: publicBranding(saved) });
    }
    const requestType = String(form.get("requestType") || ""),
      startDate = String(form.get("startDate") || ""),
      endDate = String(form.get("endDate") || ""),
      reason = String(form.get("reason") || ""),
      file = form.get("file");
    const requestedStaffId = Number(form.get("staffId") || 0);
    const targetMember =
      member.isAdmin && requestedStaffId
        ? await db.query.staff.findFirst({
            where: eq(staff.id, requestedStaffId),
          })
        : member;
    if (!targetMember || targetMember.isAdmin)
      return Response.json(
        { error: "Selecciona un empleado válido" },
        { status: 400 },
      );
    const configured = await db.query.permissionTypes.findFirst({
      where: and(
        eq(permissionTypes.name, requestType),
        eq(permissionTypes.active, true),
      ),
    });
    if (!configured)
      return Response.json(
        { error: "Este tipo de permiso no está habilitado" },
        { status: 400 },
      );
    if (configured.requiresDocument && !(file instanceof File && file.size))
      return Response.json(
        { error: "Este permiso requiere un comprobante" },
        { status: 400 },
      );
    let attachmentKey: string | null = null,
      attachmentName: string | null = null;
    if (file instanceof File && file.size) {
      if (file.size > 8 * 1024 * 1024)
        return Response.json(
          { error: "El archivo debe pesar menos de 8 MB" },
          { status: 400 },
        );
      attachmentKey = `permissions/${targetMember.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      attachmentName = file.name;
      const { env } = await import("cloudflare:workers");
      await env.BUCKET.put(attachmentKey, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      });
    }
    let vacationModelId: number | null = null;
    try {
      vacationModelId = await vacationModelForRequest(
        targetMember,
        requestType,
        startDate,
        endDate,
      );
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No fue posible validar el saldo de vacaciones",
        },
        { status: 400 },
      );
    }
    const [created] = await db
      .insert(requests)
      .values({
        staffId: targetMember.id,
        requestType,
        startDate,
        endDate,
        reason,
        attachmentKey,
        attachmentName,
        vacationModelId,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return Response.json({ created });
  }
  if (body.action === "request_create" && member) {
    const requestType = String(body.requestType),
      startDate = String(body.startDate),
      endDate = String(body.endDate);
    const requestedStaffId = Number(body.staffId || 0);
    const targetMember =
      member.isAdmin && requestedStaffId
        ? await db.query.staff.findFirst({
            where: eq(staff.id, requestedStaffId),
          })
        : member;
    if (!targetMember || targetMember.isAdmin)
      return Response.json(
        { error: "Selecciona un empleado válido" },
        { status: 400 },
      );
    let vacationModelId: number | null = null;
    try {
      vacationModelId = await vacationModelForRequest(
        targetMember,
        requestType,
        startDate,
        endDate,
      );
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No fue posible validar el saldo de vacaciones",
        },
        { status: 400 },
      );
    }
    const [created] = await db
      .insert(requests)
      .values({
        staffId: targetMember.id,
        requestType,
        startDate,
        endDate,
        reason: String(body.reason || ""),
        vacationModelId,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return Response.json({ created });
  }
  if (body.action === "custom_vacation_create") {
    if (!member.isAdmin) return permissionDenied();
    const targetMember = await db.query.staff.findFirst({
      where: eq(staff.id, Number(body.staffId)),
    });
    if (!targetMember || targetMember.isAdmin)
      return Response.json(
        { error: "Selecciona un empleado válido" },
        { status: 400 },
      );
    const dates = [
      ...new Set(
        (Array.isArray(body.dates) ? body.dates : []).map((value) =>
          String(value),
        ),
      ),
    ]
      .filter(
        (value) =>
          /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(new Date(`${value}T12:00:00`).getTime()),
      )
      .sort((a, b) => a.localeCompare(b));
    if (!dates.length || dates.length > 90)
      return Response.json(
        { error: "Selecciona entre 1 y 90 fechas válidas" },
        { status: 400 },
      );
    if (!targetMember.vacationModelId)
      return Response.json(
        { error: "El empleado no tiene un modelo de vacaciones asignado" },
        { status: 400 },
      );
    const model = await db.query.vacationModels.findFirst({
      where: eq(vacationModels.id, targetMember.vacationModelId),
    });
    if (!model)
      return Response.json(
        { error: "El modelo de vacaciones ya no está disponible" },
        { status: 400 },
      );
    const selectedWorkDays = dates.filter(
      (date) => !isConfiguredRestDay(targetMember, date),
    );
    const excludedRestDays = dates.length - selectedWorkDays.length;
    if (!selectedWorkDays.length)
      return Response.json(
        { error: "Las fechas elegidas corresponden únicamente a descansos" },
        { status: 400 },
      );
    const history = await db
      .select()
      .from(requests)
      .where(eq(requests.staffId, targetMember.id));
    const activeVacationHistory = history.filter(
      (item) =>
        item.requestType.toLowerCase().includes("vacaci") &&
        item.status !== "No autorizado",
    );
    const duplicates = selectedWorkDays.filter((date) =>
      activeVacationHistory.some(
        (item) => item.startDate <= date && item.endDate >= date,
      ),
    );
    if (duplicates.length)
      return Response.json(
        {
          error: `Ya existen vacaciones registradas para: ${duplicates.join(", ")}`,
        },
        { status: 400 },
      );
    const committed = activeVacationHistory.reduce(
      (total, item) => total + inclusiveDays(item.startDate, item.endDate),
      0,
    );
    const remaining = Math.max(0, model.totalDays - committed);
    if (selectedWorkDays.length > remaining)
      return Response.json(
        {
          error: `La selección supera el saldo disponible de ${remaining} días`,
        },
        { status: 400 },
      );
    const createdAt = new Date().toISOString();
    const created = await db
      .insert(requests)
      .values(
        selectedWorkDays.map((date) => ({
          staffId: targetMember.id,
          requestType: "Vacaciones personalizadas",
          startDate: date,
          endDate: date,
          reason: "Asignación personalizada autorizada por administración",
          status: "Autorizado",
          vacationModelId: model.id,
          createdAt,
        })),
      )
      .returning();
    return Response.json({
      created,
      createdCount: created.length,
      excludedRestDays,
      remaining: remaining - created.length,
    });
  }
  if (body.action === "birthday_update") {
    const birthday = String(body.birthday || "").trim();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(birthday) ||
      Number.isNaN(new Date(`${birthday}T12:00:00`).getTime()) ||
      birthday > new Date().toISOString().slice(0, 10)
    )
      return Response.json(
        { error: "Captura una fecha de cumpleaños válida" },
        { status: 400 },
      );
    await db.update(staff).set({ birthday }).where(eq(staff.id, member.id));
    return Response.json({ ok: true });
  }
  if (body.action === "bulk_create") {
    if (!canAccess(member, "personal", "edit")) return permissionDenied();
    const employees = Array.isArray(body.employees)
      ? body.employees.slice(0, 300)
      : [];
    if (!employees.length)
      return Response.json(
        { error: "El archivo no contiene empleados válidos" },
        { status: 400 },
      );
    const credentials: Array<Record<string, unknown>> = [];
    const errors: Array<{ row: number; message: string }> = [];
    for (let index = 0; index < employees.length; index++) {
      try {
        const result = await createEmployee(
          employees[index] as Record<string, unknown>,
          member.isAdmin,
        );
        credentials.push({
          ...result.created,
          temporaryPassword: result.temporaryPassword,
        });
      } catch (error) {
        errors.push({
          row: index + 5,
          message:
            error instanceof Error ? error.message : "No se pudo registrar",
        });
      }
    }
    return Response.json({
      createdCount: credentials.length,
      errorCount: errors.length,
      credentials,
      errors,
    });
  }
  if (body.action === "create") {
    if (!canAccess(member, "personal", "edit")) return permissionDenied();
    try {
      return Response.json(await createEmployee(body, member.isAdmin));
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No se pudo registrar al empleado",
        },
        { status: 400 },
      );
    }
  }
  if (body.action === "update") {
    if (!canAccess(member, "personal", "edit")) return permissionDenied();
    const target = await db.query.staff.findFirst({
      where: eq(staff.id, Number(body.id)),
    });
    if (!target)
      return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    const nextRole = body.jobRole ? String(body.jobRole) : target.jobRole;
    if (nextRole === "Master" && !member.isAdmin) return permissionDenied();
    if (target.isAdmin && !member.isAdmin) return permissionDenied();
    if (target.username === "master" && nextRole !== "Master")
      return Response.json(
        { error: "El Master principal no puede perder su autorización" },
        { status: 400 },
      );
    try {
      await validateBranchHours(String(body.branch), String(body.shift));
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "El turno no coincide con la sucursal",
        },
        { status: 400 },
      );
    }
    await db
      .update(staff)
      .set({
        name: body.name ? String(body.name).trim() : undefined,
        jobRole: body.jobRole ? String(body.jobRole) : undefined,
        isAdmin: nextRole === "Master" || target.username === "master",
        permissions:
          nextRole === "Master" || target.username === "master"
            ? serializePermissions(fullPermissions())
            : target.isAdmin
              ? "{}"
              : target.permissions,
        vacationModelId: body.vacationModelId
          ? Number(body.vacationModelId)
          : null,
        branch: String(body.branch),
        shift: String(body.shift),
        restDay: String(body.restDay),
        restDay2: String(body.restDay2 || "Sin asignar"),
        restType: String(body.restType || "Fijo"),
        restStartDate:
          body.restType === "Temporal" && body.restStartDate
            ? String(body.restStartDate)
            : null,
        restEndDate:
          body.restType === "Temporal" && body.restEndDate
            ? String(body.restEndDate)
            : null,
      })
      .where(eq(staff.id, Number(body.id)));
    return Response.json({ ok: true });
  }
  if (body.action === "staff_status") {
    if (!canAccess(member, "employees", "edit")) return permissionDenied();
    await db
      .update(staff)
      .set({ isActive: Boolean(body.isActive) })
      .where(and(eq(staff.id, Number(body.id)), eq(staff.isAdmin, false)));
    return Response.json({ ok: true });
  }
  if (body.action === "delete") {
    if (!canAccess(member, "employees", "edit")) return permissionDenied();
    await db
      .delete(employeeSessions)
      .where(eq(employeeSessions.staffId, Number(body.id)));
    await db
      .delete(staff)
      .where(and(eq(staff.id, Number(body.id)), eq(staff.isAdmin, false)));
    return Response.json({ ok: true });
  }
  if (body.action === "request_update") {
    if (!canAccess(member, "requests", "edit")) return permissionDenied();
    await db
      .update(requests)
      .set({
        requestType: body.requestType ? String(body.requestType) : undefined,
        startDate: body.startDate ? String(body.startDate) : undefined,
        endDate: body.endDate ? String(body.endDate) : undefined,
        reason: body.reason !== undefined ? String(body.reason) : undefined,
        status: body.status ? String(body.status) : undefined,
      })
      .where(eq(requests.id, Number(body.id)));
    return Response.json({ ok: true });
  }
  if (body.action === "request_delete") {
    if (!canAccess(member, "requests", "edit")) return permissionDenied();
    await db.delete(requests).where(eq(requests.id, Number(body.id)));
    return Response.json({ ok: true });
  }
  if (body.action === "permission_type_create") {
    if (!canAccess(member, "requests", "edit")) return permissionDenied();
    const [created] = await db
      .insert(permissionTypes)
      .values({
        name: String(body.name).trim(),
        requiresDocument: Boolean(body.requiresDocument),
        active: true,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return Response.json({ created });
  }
  if (body.action === "permission_type_update") {
    if (!canAccess(member, "requests", "edit")) return permissionDenied();
    await db
      .update(permissionTypes)
      .set({
        name: String(body.name).trim(),
        requiresDocument: Boolean(body.requiresDocument),
        active: Boolean(body.active),
      })
      .where(eq(permissionTypes.id, Number(body.id)));
    return Response.json({ ok: true });
  }
  if (body.action === "permission_type_delete") {
    if (!canAccess(member, "requests", "edit")) return permissionDenied();
    await db
      .delete(permissionTypes)
      .where(eq(permissionTypes.id, Number(body.id)));
    return Response.json({ ok: true });
  }
  if (body.action === "branch_create") {
    if (!canAccess(member, "branches", "edit")) return permissionDenied();
    const openingTime = String(body.openingTime || "10:00"),
      closingTime = String(body.closingTime || "20:00");
    if (openingTime >= closingTime)
      return Response.json(
        { error: "La hora de cierre debe ser posterior a la apertura" },
        { status: 400 },
      );
    const [created] = await db
      .insert(branches)
      .values({
        name: String(body.name).trim(),
        managerId: body.managerId ? Number(body.managerId) : null,
        openingTime,
        closingTime,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return Response.json({ created });
  }
  if (body.action === "branch_update") {
    if (!canAccess(member, "branches", "edit")) return permissionDenied();
    const openingTime = String(body.openingTime || "10:00"),
      closingTime = String(body.closingTime || "20:00");
    if (openingTime >= closingTime)
      return Response.json(
        { error: "La hora de cierre debe ser posterior a la apertura" },
        { status: 400 },
      );
    const current = await db.query.branches.findFirst({
      where: eq(branches.id, Number(body.id)),
    });
    await db
      .update(branches)
      .set({
        name: String(body.name).trim(),
        managerId: body.managerId ? Number(body.managerId) : null,
        openingTime,
        closingTime,
      })
      .where(eq(branches.id, Number(body.id)));
    if (current && current.name !== String(body.name).trim())
      await db
        .update(staff)
        .set({ branch: String(body.name).trim() })
        .where(eq(staff.branch, current.name));
    return Response.json({ ok: true });
  }
  if (body.action === "branch_delete") {
    if (!canAccess(member, "branches", "edit")) return permissionDenied();
    const current = await db.query.branches.findFirst({
      where: eq(branches.id, Number(body.id)),
    });
    if (current)
      await db
        .update(staff)
        .set({ branch: "Sin asignar" })
        .where(eq(staff.branch, current.name));
    await db.delete(branches).where(eq(branches.id, Number(body.id)));
    return Response.json({ ok: true });
  }
  if (body.action === "assignment_set") {
    if (
      !canAccess(member, "calendar", "edit") &&
      !canAccess(member, "facialists", "edit")
    )
      return permissionDenied();
    const staffId = Number(body.staffId),
      workDate = String(body.workDate),
      shift = String(body.shift);
    if (
      member.jobRole.toLowerCase().includes("facialista") &&
      staffId !== member.id
    )
      return permissionDenied();
    try {
      await validateBranchHours(String(body.branch), shift);
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "El turno no coincide con la sucursal",
        },
        { status: 400 },
      );
    }
    await db
      .insert(dailyAssignments)
      .values({
        staffId,
        workDate,
        branch: String(body.branch),
        shift,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [dailyAssignments.staffId, dailyAssignments.workDate],
        set: { branch: String(body.branch), shift },
      });
    return Response.json({ ok: true });
  }
  if (body.action === "regenerate") {
    if (!canAccess(member, "personal", "edit")) return permissionDenied();
    const code = `KEY-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await db
      .delete(employeeSessions)
      .where(eq(employeeSessions.staffId, Number(body.id)));
    await db
      .update(staff)
      .set({ accessCodeHash: await sha(code) })
      .where(and(eq(staff.id, Number(body.id)), eq(staff.isAdmin, false)));
    const regenerated = await db.query.staff.findFirst({
      where: eq(staff.id, Number(body.id)),
    });
    return Response.json({
      temporaryPassword: code,
      username: regenerated?.username || "",
    });
  }
  if (body.action === "permissions_update") {
    if (!member.isAdmin) return permissionDenied();
    const target = await db.query.staff.findFirst({
      where: eq(staff.id, Number(body.id)),
    });
    if (!target || target.isAdmin)
      return Response.json(
        { error: "Los permisos del Maestro no pueden modificarse" },
        { status: 400 },
      );
    const normalized = parsePermissions(JSON.stringify(body.permissions || {}));
    await db
      .update(staff)
      .set({ permissions: serializePermissions(normalized) })
      .where(eq(staff.id, target.id));
    return Response.json({ ok: true });
  }
  if (body.action === "job_role_create") {
    if (!canAccess(member, "positions", "edit")) return permissionDenied();
    const name = String(body.name || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 70);
    if (!name)
      return Response.json(
        { error: "Captura el nombre del puesto" },
        { status: 400 },
      );
    const existing = await db.query.jobRoles.findFirst({
      where: eq(jobRoles.name, name),
    });
    if (existing)
      return Response.json({ error: "Este puesto ya existe" }, { status: 400 });
    const [created] = await db
      .insert(jobRoles)
      .values({ name, active: true, createdAt: new Date().toISOString() })
      .returning();
    return Response.json({ created });
  }
  if (body.action === "job_role_update") {
    if (!canAccess(member, "positions", "edit")) return permissionDenied();
    const id = Number(body.id),
      name = String(body.name || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 70);
    if (!name)
      return Response.json(
        { error: "Captura el nombre del puesto" },
        { status: 400 },
      );
    const current = await db.query.jobRoles.findFirst({
      where: eq(jobRoles.id, id),
    });
    if (!current)
      return Response.json({ error: "Puesto no encontrado" }, { status: 404 });
    if (
      current.name === "Master" &&
      (name !== "Master" || !Boolean(body.active))
    )
      return Response.json(
        { error: "El puesto Master no puede renombrarse ni desactivarse" },
        { status: 400 },
      );
    const duplicate = await db.query.jobRoles.findFirst({
      where: eq(jobRoles.name, name),
    });
    if (duplicate && duplicate.id !== id)
      return Response.json(
        { error: "Ya existe otro puesto con ese nombre" },
        { status: 400 },
      );
    await db
      .update(jobRoles)
      .set({ name, active: Boolean(body.active) })
      .where(eq(jobRoles.id, id));
    if (current.name !== name)
      await db
        .update(staff)
        .set({ jobRole: name })
        .where(eq(staff.jobRole, current.name));
    return Response.json({ ok: true });
  }
  if (body.action === "job_role_delete") {
    if (!canAccess(member, "positions", "edit")) return permissionDenied();
    const id = Number(body.id),
      current = await db.query.jobRoles.findFirst({
        where: eq(jobRoles.id, id),
      });
    if (!current)
      return Response.json({ error: "Puesto no encontrado" }, { status: 404 });
    if (current.name === "Sin puesto" || current.name === "Master")
      return Response.json(
        { error: "Este puesto protegido no puede eliminarse" },
        { status: 400 },
      );
    let fallback = await db.query.jobRoles.findFirst({
      where: eq(jobRoles.name, "Sin puesto"),
    });
    if (!fallback)
      [fallback] = await db
        .insert(jobRoles)
        .values({
          name: "Sin puesto",
          active: true,
          createdAt: new Date().toISOString(),
        })
        .returning();
    await db
      .update(staff)
      .set({ jobRole: fallback.name })
      .where(eq(staff.jobRole, current.name));
    await db.delete(jobRoles).where(eq(jobRoles.id, id));
    return Response.json({ ok: true });
  }
  if (body.action === "vacation_model_create") {
    if (!member.isAdmin) return permissionDenied();
    const name = String(body.name || "").trim(),
      periodType = String(body.periodType || "periodo"),
      totalDays = Number(body.totalDays);
    if (
      !name ||
      !Number.isInteger(totalDays) ||
      totalDays < 1 ||
      totalDays > 365
    )
      return Response.json(
        { error: "Captura un nombre y una cantidad válida de días" },
        { status: 400 },
      );
    const [created] = await db
      .insert(vacationModels)
      .values({
        name,
        periodType,
        totalDays,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return Response.json({ created });
  }
  if (body.action === "vacation_model_update") {
    if (!member.isAdmin) return permissionDenied();
    const totalDays = Number(body.totalDays);
    if (
      !String(body.name || "").trim() ||
      !Number.isInteger(totalDays) ||
      totalDays < 1 ||
      totalDays > 365
    )
      return Response.json(
        { error: "Modelo de vacaciones no válido" },
        { status: 400 },
      );
    await db
      .update(vacationModels)
      .set({
        name: String(body.name).trim(),
        periodType: String(body.periodType || "periodo"),
        totalDays,
      })
      .where(eq(vacationModels.id, Number(body.id)));
    return Response.json({ ok: true });
  }
  if (body.action === "vacation_model_delete") {
    if (!member.isAdmin) return permissionDenied();
    const id = Number(body.id);
    await db
      .update(staff)
      .set({ vacationModelId: null })
      .where(eq(staff.vacationModelId, id));
    await db.delete(vacationModels).where(eq(vacationModels.id, id));
    return Response.json({ ok: true });
  }
  if (body.action === "vacation_model_assign") {
    if (!member.isAdmin) return permissionDenied();
    const modelId = Number(body.vacationModelId || 0);
    if (
      modelId &&
      !(await db.query.vacationModels.findFirst({
        where: eq(vacationModels.id, modelId),
      }))
    )
      return Response.json(
        { error: "Modelo de vacaciones no encontrado" },
        { status: 404 },
      );
    await db
      .update(staff)
      .set({ vacationModelId: modelId || null })
      .where(and(eq(staff.id, Number(body.staffId)), eq(staff.isAdmin, false)));
    return Response.json({ ok: true });
  }
  if (body.action === "policy_document_delete") {
    if (!canAccess(member, "policies", "edit")) return permissionDenied();
    const record = await db.query.policyDocuments.findFirst({
      where: eq(policyDocuments.id, Number(body.id)),
    });
    if (record) {
      const { env } = await import("cloudflare:workers");
      await env.BUCKET.delete(record.fileKey);
      await db.delete(policyDocuments).where(eq(policyDocuments.id, record.id));
    }
    return Response.json({ ok: true });
  }
  if (body.action === "bulk_delete") {
    const ids = Array.isArray(body.ids)
      ? [
          ...new Set(
            body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0),
          ),
        ].slice(0, 500)
      : [];
    if (!ids.length)
      return Response.json(
        { error: "Selecciona al menos un registro" },
        { status: 400 },
      );
    const entity = String(body.entity || "");
    if (entity === "staff") {
      if (!canAccess(member, "employees", "edit")) return permissionDenied();
      const targets = await db
        .select({ id: staff.id })
        .from(staff)
        .where(and(inArray(staff.id, ids), eq(staff.isAdmin, false)));
      const targetIds = targets.map((item) => item.id);
      if (targetIds.length) {
        await db
          .delete(employeeSessions)
          .where(inArray(employeeSessions.staffId, targetIds));
        await db
          .delete(dailyAssignments)
          .where(inArray(dailyAssignments.staffId, targetIds));
        await db.delete(requests).where(inArray(requests.staffId, targetIds));
        await db.delete(staff).where(inArray(staff.id, targetIds));
      }
    } else if (entity === "requests") {
      if (!canAccess(member, "requests", "edit")) return permissionDenied();
      await db.delete(requests).where(inArray(requests.id, ids));
    } else if (entity === "branches") {
      if (!canAccess(member, "branches", "edit")) return permissionDenied();
      const targets = await db
        .select()
        .from(branches)
        .where(inArray(branches.id, ids));
      for (const target of targets)
        await db
          .update(staff)
          .set({ branch: "Sin asignar" })
          .where(eq(staff.branch, target.name));
      await db.delete(branches).where(inArray(branches.id, ids));
    } else if (entity === "documents") {
      if (!canAccess(member, "policies", "edit")) return permissionDenied();
      const targets = await db
        .select()
        .from(policyDocuments)
        .where(inArray(policyDocuments.id, ids));
      const { env } = await import("cloudflare:workers");
      for (const target of targets) await env.BUCKET.delete(target.fileKey);
      await db.delete(policyDocuments).where(inArray(policyDocuments.id, ids));
    } else
      return Response.json(
        { error: "Tipo de registro no válido" },
        { status: 400 },
      );
    return Response.json({ ok: true, deleted: ids.length });
  }
  if (body.action === "master_credentials") {
    if (!member.isAdmin) return permissionDenied();
    const target = await db.query.staff.findFirst({
      where: and(eq(staff.id, Number(body.id)), eq(staff.isAdmin, true)),
    });
    if (!target)
      return Response.json(
        { error: "Usuario Maestro no encontrado" },
        { status: 404 },
      );
    const normalized = await ensureMasterAccount(target);
    const code = `KEY-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await db
      .delete(employeeSessions)
      .where(eq(employeeSessions.staffId, normalized.id));
    await db
      .update(staff)
      .set({ accessCodeHash: await sha(code) })
      .where(eq(staff.id, normalized.id));
    return Response.json({
      username: normalized.username || "master",
      temporaryPassword: code,
    });
  }
  return Response.json({ error: "Acción no válida" }, { status: 400 });
}
