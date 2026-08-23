import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const staff = sqliteTable("staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  firstName: text("first_name"),
  paternalSurname: text("paternal_surname"),
  maternalSurname: text("maternal_surname"),
  username: text("username").unique(),
  jobRole: text("job_role").notNull(),
  email: text("email").unique(),
  invitedEmail: text("invited_email"),
  accessCodeHash: text("access_code_hash"),
  permissions: text("permissions").notNull().default("{}"),
  vacationModelId: integer("vacation_model_id"),
  birthday: text("birthday"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  branch: text("branch").notNull().default("Sin asignar"),
  shift: text("shift").notNull().default("Sin asignar"),
  restDay: text("rest_day").notNull().default("Sin asignar"),
  restDay2: text("rest_day_2").notNull().default("Sin asignar"),
  restType: text("rest_type").notNull().default("Fijo"),
  restStartDate: text("rest_start_date"),
  restEndDate: text("rest_end_date"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const branches = sqliteTable("branches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  managerId: integer("manager_id"),
  openingTime: text("opening_time").notNull().default("10:00"),
  closingTime: text("closing_time").notNull().default("20:00"),
  createdAt: text("created_at").notNull(),
});

export const requests = sqliteTable("requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull(),
  requestType: text("request_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("Pendiente"),
  attachmentKey: text("attachment_key"),
  attachmentName: text("attachment_name"),
  vacationModelId: integer("vacation_model_id"),
  createdAt: text("created_at").notNull(),
});

export const permissionTypes = sqliteTable("permission_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  requiresDocument: integer("requires_document", { mode: "boolean" })
    .notNull()
    .default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const dailyAssignments = sqliteTable(
  "daily_assignments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    staffId: integer("staff_id").notNull(),
    workDate: text("work_date").notNull(),
    branch: text("branch").notNull(),
    shift: text("shift").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("daily_staff_date_unique").on(table.staffId, table.workDate),
  ],
);

export const employeeSessions = sqliteTable("employee_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const brandSettings = sqliteTable("brand_settings", {
  id: integer("id").primaryKey(),
  brandName: text("brand_name").notNull().default("KEYSAR"),
  brandSubtitle: text("brand_subtitle")
    .notNull()
    .default("COSMETICS · GESTIÓN DE PERSONAL"),
  logoKey: text("logo_key"),
  logoName: text("logo_name"),
  logoContentType: text("logo_content_type"),
  updatedAt: text("updated_at").notNull(),
});

export const vacationModels = sqliteTable("vacation_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  periodType: text("period_type").notNull(),
  totalDays: integer("total_days").notNull(),
  createdAt: text("created_at").notNull(),
});

export const jobRoles = sqliteTable("job_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const policyDocuments = sqliteTable("policy_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  fileKey: text("file_key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: text("created_at").notNull(),
});
