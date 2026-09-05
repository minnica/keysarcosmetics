-- Fase 2 Scheduler: catálogos operativos, profesionales, recursos y horarios.
-- Migración exclusivamente aditiva. No crea perfiles, asignaciones ni datos operativos.

CREATE TYPE "SchedulerWeekday" AS ENUM (
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
);
CREATE TYPE "SchedulerAvailabilityRuleKind" AS ENUM ('WORKING', 'BREAK');
CREATE TYPE "SchedulerAvailabilityExceptionKind" AS ENUM ('AVAILABLE', 'UNAVAILABLE');
CREATE TYPE "SchedulerServiceMode" AS ENUM ('INDIVIDUAL', 'CLASS');
CREATE TYPE "SchedulerResourceKind" AS ENUM ('ROOM', 'EQUIPMENT', 'STATION', 'OTHER');

CREATE TABLE "SchedulerCommerce" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerCommerce_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCommerce_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerBranchProfile" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "timezone" VARCHAR(80) NOT NULL DEFAULT 'America/Mexico_City',
  "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerBranchProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerBranchProfile_version_check" CHECK ("version" > 0),
  CONSTRAINT "SchedulerBranchProfile_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerProfessionalProfile" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "biography" TEXT,
  "acceptsOnline" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerProfessionalProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerProfessionalProfile_version_check" CHECK ("version" > 0),
  CONSTRAINT "SchedulerProfessionalProfile_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerProfessionalBranchAssignment" (
  "id" TEXT NOT NULL,
  "professionalProfileId" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerProfessionalBranchAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerProfessionalBranchAssignment_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerServiceProfile" (
  "id" TEXT NOT NULL,
  "catalogItemId" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "preparationMinutes" INTEGER NOT NULL DEFAULT 0,
  "cleanupMinutes" INTEGER NOT NULL DEFAULT 0,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "mode" "SchedulerServiceMode" NOT NULL DEFAULT 'INDIVIDUAL',
  "acceptsOnline" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerServiceProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerServiceProfile_rules_check" CHECK (
    "durationMinutes" > 0 AND "preparationMinutes" >= 0
    AND "cleanupMinutes" >= 0 AND "capacity" > 0 AND "version" > 0
  ),
  CONSTRAINT "SchedulerServiceProfile_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerServiceBranchAssignment" (
  "id" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerServiceBranchAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerServiceBranchAssignment_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerProfessionalServiceAssignment" (
  "id" TEXT NOT NULL,
  "professionalProfileId" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerProfessionalServiceAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerProfessionalServiceAssignment_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerSpecialty" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerSpecialty_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerSpecialty_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerProfessionalSpecialty" (
  "id" TEXT NOT NULL,
  "professionalProfileId" TEXT NOT NULL,
  "specialtyId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerProfessionalSpecialty_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerProfessionalSpecialty_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerProfessionalGroup" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerProfessionalGroup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerProfessionalGroup_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerProfessionalGroupMember" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "professionalProfileId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerProfessionalGroupMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerProfessionalGroupMember_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerResource" (
  "id" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "kind" "SchedulerResourceKind" NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "exclusive" BOOLEAN NOT NULL DEFAULT true,
  "acceptsOnline" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerResource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerResource_capacity_check" CHECK ("capacity" > 0 AND "version" > 0),
  CONSTRAINT "SchedulerResource_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerServiceResourceRequirement" (
  "id" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "requiredUnits" INTEGER NOT NULL DEFAULT 1,
  "exclusive" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerServiceResourceRequirement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerServiceResourceRequirement_units_check" CHECK ("requiredUnits" > 0),
  CONSTRAINT "SchedulerServiceResourceRequirement_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerAvailabilityRule" (
  "id" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "professionalProfileId" TEXT,
  "resourceId" TEXT,
  "kind" "SchedulerAvailabilityRuleKind" NOT NULL,
  "weekday" "SchedulerWeekday" NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerAvailabilityRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAvailabilityRule_owner_check" CHECK (
    NOT ("professionalProfileId" IS NOT NULL AND "resourceId" IS NOT NULL)
  ),
  CONSTRAINT "SchedulerAvailabilityRule_minutes_check" CHECK (
    "startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440
  ),
  CONSTRAINT "SchedulerAvailabilityRule_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE TABLE "SchedulerAvailabilityException" (
  "id" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "professionalProfileId" TEXT,
  "resourceId" TEXT,
  "kind" "SchedulerAvailabilityExceptionKind" NOT NULL,
  "date" DATE NOT NULL,
  "startMinute" INTEGER,
  "endMinute" INTEGER,
  "reason" VARCHAR(500),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerAvailabilityException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAvailabilityException_owner_check" CHECK (
    NOT ("professionalProfileId" IS NOT NULL AND "resourceId" IS NOT NULL)
  ),
  CONSTRAINT "SchedulerAvailabilityException_minutes_check" CHECK (
    ("startMinute" IS NULL AND "endMinute" IS NULL)
    OR ("startMinute" IS NOT NULL AND "endMinute" IS NOT NULL
      AND "startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440)
  ),
  CONSTRAINT "SchedulerAvailabilityException_validity_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  )
);

CREATE UNIQUE INDEX "SchedulerCommerce_normalizedName_key" ON "SchedulerCommerce"("normalizedName");
CREATE INDEX "SchedulerCommerce_active_effectiveFrom_effectiveTo_idx" ON "SchedulerCommerce"("active", "effectiveFrom", "effectiveTo");
CREATE UNIQUE INDEX "SchedulerBranchProfile_branchId_key" ON "SchedulerBranchProfile"("branchId");
CREATE INDEX "SchedulerBranchProfile_commerceId_active_idx" ON "SchedulerBranchProfile"("commerceId", "active");
CREATE INDEX "SchedulerBranchProfile_bookingEnabled_active_idx" ON "SchedulerBranchProfile"("bookingEnabled", "active");
CREATE UNIQUE INDEX "SchedulerProfessionalProfile_employeeId_key" ON "SchedulerProfessionalProfile"("employeeId");
CREATE INDEX "SchedulerProfessionalProfile_active_effectiveFrom_effectiveTo_idx" ON "SchedulerProfessionalProfile"("active", "effectiveFrom", "effectiveTo");
CREATE UNIQUE INDEX "SchedulerProfessionalBranchAssignment_professionalProfileId_branchProfileId_key" ON "SchedulerProfessionalBranchAssignment"("professionalProfileId", "branchProfileId");
CREATE INDEX "SchedulerProfessionalBranchAssignment_branchProfileId_active_idx" ON "SchedulerProfessionalBranchAssignment"("branchProfileId", "active");
CREATE UNIQUE INDEX "SchedulerServiceProfile_catalogItemId_key" ON "SchedulerServiceProfile"("catalogItemId");
CREATE INDEX "SchedulerServiceProfile_active_mode_idx" ON "SchedulerServiceProfile"("active", "mode");
CREATE UNIQUE INDEX "SchedulerServiceBranchAssignment_serviceProfileId_branchProfileId_key" ON "SchedulerServiceBranchAssignment"("serviceProfileId", "branchProfileId");
CREATE INDEX "SchedulerServiceBranchAssignment_branchProfileId_active_idx" ON "SchedulerServiceBranchAssignment"("branchProfileId", "active");
CREATE UNIQUE INDEX "SchedulerProfessionalServiceAssignment_professionalProfileId_serviceProfileId_branchProfileId_key" ON "SchedulerProfessionalServiceAssignment"("professionalProfileId", "serviceProfileId", "branchProfileId");
CREATE INDEX "SchedulerProfessionalServiceAssignment_serviceProfileId_branchProfileId_active_idx" ON "SchedulerProfessionalServiceAssignment"("serviceProfileId", "branchProfileId", "active");
CREATE UNIQUE INDEX "SchedulerSpecialty_commerceId_normalizedName_key" ON "SchedulerSpecialty"("commerceId", "normalizedName");
CREATE INDEX "SchedulerSpecialty_commerceId_active_idx" ON "SchedulerSpecialty"("commerceId", "active");
CREATE UNIQUE INDEX "SchedulerProfessionalSpecialty_professionalProfileId_specialtyId_key" ON "SchedulerProfessionalSpecialty"("professionalProfileId", "specialtyId");
CREATE INDEX "SchedulerProfessionalSpecialty_specialtyId_active_idx" ON "SchedulerProfessionalSpecialty"("specialtyId", "active");
CREATE UNIQUE INDEX "SchedulerProfessionalGroup_branchProfileId_normalizedName_key" ON "SchedulerProfessionalGroup"("branchProfileId", "normalizedName");
CREATE INDEX "SchedulerProfessionalGroup_commerceId_active_idx" ON "SchedulerProfessionalGroup"("commerceId", "active");
CREATE UNIQUE INDEX "SchedulerProfessionalGroupMember_groupId_professionalProfileId_key" ON "SchedulerProfessionalGroupMember"("groupId", "professionalProfileId");
CREATE INDEX "SchedulerProfessionalGroupMember_professionalProfileId_active_idx" ON "SchedulerProfessionalGroupMember"("professionalProfileId", "active");
CREATE UNIQUE INDEX "SchedulerResource_branchProfileId_normalizedName_key" ON "SchedulerResource"("branchProfileId", "normalizedName");
CREATE INDEX "SchedulerResource_branchProfileId_active_idx" ON "SchedulerResource"("branchProfileId", "active");
CREATE UNIQUE INDEX "SchedulerServiceResourceRequirement_serviceProfileId_resourceId_key" ON "SchedulerServiceResourceRequirement"("serviceProfileId", "resourceId");
CREATE INDEX "SchedulerServiceResourceRequirement_resourceId_active_idx" ON "SchedulerServiceResourceRequirement"("resourceId", "active");
CREATE INDEX "SchedulerAvailabilityRule_branchProfileId_weekday_active_idx" ON "SchedulerAvailabilityRule"("branchProfileId", "weekday", "active");
CREATE INDEX "SchedulerAvailabilityRule_professionalProfileId_weekday_active_idx" ON "SchedulerAvailabilityRule"("professionalProfileId", "weekday", "active");
CREATE INDEX "SchedulerAvailabilityRule_resourceId_weekday_active_idx" ON "SchedulerAvailabilityRule"("resourceId", "weekday", "active");
CREATE INDEX "SchedulerAvailabilityException_branchProfileId_date_active_idx" ON "SchedulerAvailabilityException"("branchProfileId", "date", "active");
CREATE INDEX "SchedulerAvailabilityException_professionalProfileId_date_active_idx" ON "SchedulerAvailabilityException"("professionalProfileId", "date", "active");
CREATE INDEX "SchedulerAvailabilityException_resourceId_date_active_idx" ON "SchedulerAvailabilityException"("resourceId", "date", "active");

ALTER TABLE "SchedulerBranchProfile" ADD CONSTRAINT "SchedulerBranchProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerBranchProfile" ADD CONSTRAINT "SchedulerBranchProfile_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalProfile" ADD CONSTRAINT "SchedulerProfessionalProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalBranchAssignment" ADD CONSTRAINT "SchedulerProfessionalBranchAssignment_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalBranchAssignment" ADD CONSTRAINT "SchedulerProfessionalBranchAssignment_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerServiceProfile" ADD CONSTRAINT "SchedulerServiceProfile_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerServiceBranchAssignment" ADD CONSTRAINT "SchedulerServiceBranchAssignment_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerServiceBranchAssignment" ADD CONSTRAINT "SchedulerServiceBranchAssignment_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalServiceAssignment" ADD CONSTRAINT "SchedulerProfessionalServiceAssignment_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalServiceAssignment" ADD CONSTRAINT "SchedulerProfessionalServiceAssignment_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalServiceAssignment" ADD CONSTRAINT "SchedulerProfessionalServiceAssignment_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSpecialty" ADD CONSTRAINT "SchedulerSpecialty_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalSpecialty" ADD CONSTRAINT "SchedulerProfessionalSpecialty_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalSpecialty" ADD CONSTRAINT "SchedulerProfessionalSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "SchedulerSpecialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalGroup" ADD CONSTRAINT "SchedulerProfessionalGroup_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalGroup" ADD CONSTRAINT "SchedulerProfessionalGroup_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalGroupMember" ADD CONSTRAINT "SchedulerProfessionalGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SchedulerProfessionalGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerProfessionalGroupMember" ADD CONSTRAINT "SchedulerProfessionalGroupMember_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerResource" ADD CONSTRAINT "SchedulerResource_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerServiceResourceRequirement" ADD CONSTRAINT "SchedulerServiceResourceRequirement_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerServiceResourceRequirement" ADD CONSTRAINT "SchedulerServiceResourceRequirement_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SchedulerResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAvailabilityRule" ADD CONSTRAINT "SchedulerAvailabilityRule_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAvailabilityRule" ADD CONSTRAINT "SchedulerAvailabilityRule_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAvailabilityRule" ADD CONSTRAINT "SchedulerAvailabilityRule_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SchedulerResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAvailabilityException" ADD CONSTRAINT "SchedulerAvailabilityException_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAvailabilityException" ADD CONSTRAINT "SchedulerAvailabilityException_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAvailabilityException" ADD CONSTRAINT "SchedulerAvailabilityException_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SchedulerResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
