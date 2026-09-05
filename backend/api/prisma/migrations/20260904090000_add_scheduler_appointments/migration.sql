-- Fase 4 Scheduler: motor canónico de disponibilidad, citas y bloqueos.
-- Migración exclusivamente aditiva. No importa mocks, no crea citas y no transforma Agenda/POS.

CREATE TYPE "SchedulerAppointmentStatus" AS ENUM (
  'PENDING', 'RESERVED', 'CONFIRMED', 'ARRIVED', 'WAITING', 'ATTENDED', 'NO_SHOW', 'CANCELED'
);
CREATE TYPE "SchedulerAppointmentOrigin" AS ENUM ('SCHEDULER', 'POS', 'INTERNAL_API', 'IMPORT');
CREATE TYPE "SchedulerAppointmentParticipantRole" AS ENUM ('PRIMARY', 'SUPPORT');
CREATE TYPE "SchedulerMembershipBenefitStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');
CREATE TYPE "SchedulerScheduleBlockStatus" AS ENUM ('ACTIVE', 'CANCELED');

CREATE TABLE "SchedulerAppointment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "branchProfileId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "status" "SchedulerAppointmentStatus" NOT NULL DEFAULT 'RESERVED',
  "origin" "SchedulerAppointmentOrigin" NOT NULL DEFAULT 'SCHEDULER',
  "timezone" VARCHAR(80) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "cancellationReason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerAppointment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAppointment_window_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "SchedulerAppointment_version_check" CHECK ("version" > 0),
  CONSTRAINT "SchedulerAppointment_cancellation_check" CHECK (
    "status" <> 'CANCELED' OR "cancellationReason" IS NOT NULL
  )
);

CREATE TABLE "SchedulerAppointmentService" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointmentId" UUID NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "serviceNameSnapshot" VARCHAR(240) NOT NULL,
  "serviceVersionSnapshot" INTEGER NOT NULL,
  "durationMinutesSnapshot" INTEGER NOT NULL,
  "preparationMinutesSnapshot" INTEGER NOT NULL,
  "cleanupMinutesSnapshot" INTEGER NOT NULL,
  "capacityUnits" INTEGER NOT NULL DEFAULT 1,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "occupiesFrom" TIMESTAMP(3) NOT NULL,
  "occupiesUntil" TIMESTAMP(3) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerAppointmentService_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAppointmentService_values_check" CHECK (
    "sequence" >= 0 AND "serviceVersionSnapshot" > 0
    AND "durationMinutesSnapshot" > 0
    AND "preparationMinutesSnapshot" >= 0
    AND "cleanupMinutesSnapshot" >= 0
    AND "capacityUnits" > 0
    AND "endsAt" > "startsAt"
    AND "occupiesFrom" <= "startsAt"
    AND "occupiesUntil" >= "endsAt"
  )
);

CREATE TABLE "SchedulerAppointmentParticipant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointmentServiceId" UUID NOT NULL,
  "professionalProfileId" TEXT NOT NULL,
  "role" "SchedulerAppointmentParticipantRole" NOT NULL DEFAULT 'PRIMARY',
  "professionalNameSnapshot" VARCHAR(240) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerAppointmentParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerAppointmentResource" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointmentServiceId" UUID NOT NULL,
  "resourceId" TEXT NOT NULL,
  "units" INTEGER NOT NULL DEFAULT 1,
  "exclusiveSnapshot" BOOLEAN NOT NULL,
  "resourceNameSnapshot" VARCHAR(160) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerAppointmentResource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAppointmentResource_units_check" CHECK ("units" > 0)
);

CREATE TABLE "SchedulerAppointmentMembershipBenefit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointmentServiceId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "status" "SchedulerMembershipBenefitStatus" NOT NULL DEFAULT 'RESERVED',
  "membershipNameSnapshot" VARCHAR(240) NOT NULL,
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerAppointmentMembershipBenefit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAppointmentMembershipBenefit_state_check" CHECK (
    ("status" = 'RESERVED' AND "consumedAt" IS NULL AND "releasedAt" IS NULL)
    OR ("status" = 'CONSUMED' AND "consumedAt" IS NOT NULL AND "releasedAt" IS NULL)
    OR ("status" = 'RELEASED' AND "releasedAt" IS NOT NULL AND "consumedAt" IS NULL)
  )
);

CREATE TABLE "SchedulerAppointmentStateHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointmentId" UUID NOT NULL,
  "fromStatus" "SchedulerAppointmentStatus",
  "toStatus" "SchedulerAppointmentStatus" NOT NULL,
  "reason" VARCHAR(500),
  "version" INTEGER NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerAppointmentStateHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAppointmentStateHistory_version_check" CHECK ("version" > 0)
);

CREATE TABLE "SchedulerScheduleBlock" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "branchProfileId" TEXT NOT NULL,
  "professionalProfileId" TEXT,
  "resourceId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "timezone" VARCHAR(80) NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "status" "SchedulerScheduleBlockStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "canceledByUserId" TEXT,
  "canceledAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerScheduleBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerScheduleBlock_window_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "SchedulerScheduleBlock_version_check" CHECK ("version" > 0),
  CONSTRAINT "SchedulerScheduleBlock_owner_check" CHECK (
    NOT ("professionalProfileId" IS NOT NULL AND "resourceId" IS NOT NULL)
  ),
  CONSTRAINT "SchedulerScheduleBlock_cancel_check" CHECK (
    ("status" = 'ACTIVE' AND "canceledAt" IS NULL AND "canceledByUserId" IS NULL)
    OR ("status" = 'CANCELED' AND "canceledAt" IS NOT NULL AND "canceledByUserId" IS NOT NULL)
  )
);

CREATE TABLE "SchedulerIdempotencyKey" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorUserId" TEXT NOT NULL,
  "operation" VARCHAR(80) NOT NULL,
  "idempotencyKey" VARCHAR(160) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "appointmentId" UUID,
  "response" JSONB NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerIdempotencyKey_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PosAppointment" ADD COLUMN "schedulerAppointmentId" UUID;

CREATE INDEX "SchedulerAppointment_branchProfileId_startsAt_endsAt_idx" ON "SchedulerAppointment"("branchProfileId", "startsAt", "endsAt");
CREATE INDEX "SchedulerAppointment_branchProfileId_status_startsAt_idx" ON "SchedulerAppointment"("branchProfileId", "status", "startsAt");
CREATE INDEX "SchedulerAppointment_customerId_startsAt_idx" ON "SchedulerAppointment"("customerId", "startsAt");
CREATE UNIQUE INDEX "SchedulerAppointmentService_appointmentId_sequence_key" ON "SchedulerAppointmentService"("appointmentId", "sequence");
CREATE INDEX "SchedulerAppointmentService_serviceProfileId_startsAt_endsAt_idx" ON "SchedulerAppointmentService"("serviceProfileId", "startsAt", "endsAt");
CREATE INDEX "SchedulerAppointmentService_occupiesFrom_occupiesUntil_idx" ON "SchedulerAppointmentService"("occupiesFrom", "occupiesUntil");
CREATE UNIQUE INDEX "SchedulerAppointmentParticipant_appointmentServiceId_professionalProfileId_key" ON "SchedulerAppointmentParticipant"("appointmentServiceId", "professionalProfileId");
CREATE INDEX "SchedulerAppointmentParticipant_professionalProfileId_appointmentServiceId_idx" ON "SchedulerAppointmentParticipant"("professionalProfileId", "appointmentServiceId");
CREATE UNIQUE INDEX "SchedulerAppointmentResource_appointmentServiceId_resourceId_key" ON "SchedulerAppointmentResource"("appointmentServiceId", "resourceId");
CREATE INDEX "SchedulerAppointmentResource_resourceId_appointmentServiceId_idx" ON "SchedulerAppointmentResource"("resourceId", "appointmentServiceId");
CREATE UNIQUE INDEX "SchedulerAppointmentMembershipBenefit_appointmentServiceId_key" ON "SchedulerAppointmentMembershipBenefit"("appointmentServiceId");
CREATE INDEX "SchedulerAppointmentMembershipBenefit_membershipId_status_idx" ON "SchedulerAppointmentMembershipBenefit"("membershipId", "status");
CREATE UNIQUE INDEX "SchedulerAppointmentStateHistory_appointmentId_version_key" ON "SchedulerAppointmentStateHistory"("appointmentId", "version");
CREATE INDEX "SchedulerAppointmentStateHistory_appointmentId_creadoEn_idx" ON "SchedulerAppointmentStateHistory"("appointmentId", "creadoEn");
CREATE INDEX "SchedulerScheduleBlock_branchProfileId_status_startsAt_endsAt_idx" ON "SchedulerScheduleBlock"("branchProfileId", "status", "startsAt", "endsAt");
CREATE INDEX "SchedulerScheduleBlock_professionalProfileId_status_startsAt_idx" ON "SchedulerScheduleBlock"("professionalProfileId", "status", "startsAt");
CREATE INDEX "SchedulerScheduleBlock_resourceId_status_startsAt_idx" ON "SchedulerScheduleBlock"("resourceId", "status", "startsAt");
CREATE UNIQUE INDEX "SchedulerIdempotencyKey_actorUserId_operation_idempotencyKey_key" ON "SchedulerIdempotencyKey"("actorUserId", "operation", "idempotencyKey");
CREATE INDEX "SchedulerIdempotencyKey_appointmentId_idx" ON "SchedulerIdempotencyKey"("appointmentId");
CREATE INDEX "PosAppointment_schedulerAppointmentId_idx" ON "PosAppointment"("schedulerAppointmentId");

ALTER TABLE "SchedulerAppointment" ADD CONSTRAINT "SchedulerAppointment_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointment" ADD CONSTRAINT "SchedulerAppointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointment" ADD CONSTRAINT "SchedulerAppointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointment" ADD CONSTRAINT "SchedulerAppointment_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentService" ADD CONSTRAINT "SchedulerAppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "SchedulerAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentService" ADD CONSTRAINT "SchedulerAppointmentService_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentParticipant" ADD CONSTRAINT "SchedulerAppointmentParticipant_appointmentServiceId_fkey" FOREIGN KEY ("appointmentServiceId") REFERENCES "SchedulerAppointmentService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentParticipant" ADD CONSTRAINT "SchedulerAppointmentParticipant_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentResource" ADD CONSTRAINT "SchedulerAppointmentResource_appointmentServiceId_fkey" FOREIGN KEY ("appointmentServiceId") REFERENCES "SchedulerAppointmentService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentResource" ADD CONSTRAINT "SchedulerAppointmentResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SchedulerResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentMembershipBenefit" ADD CONSTRAINT "SchedulerAppointmentMembershipBenefit_appointmentServiceId_fkey" FOREIGN KEY ("appointmentServiceId") REFERENCES "SchedulerAppointmentService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentMembershipBenefit" ADD CONSTRAINT "SchedulerAppointmentMembershipBenefit_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "PosClientMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentStateHistory" ADD CONSTRAINT "SchedulerAppointmentStateHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "SchedulerAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAppointmentStateHistory" ADD CONSTRAINT "SchedulerAppointmentStateHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerScheduleBlock" ADD CONSTRAINT "SchedulerScheduleBlock_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerScheduleBlock" ADD CONSTRAINT "SchedulerScheduleBlock_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerScheduleBlock" ADD CONSTRAINT "SchedulerScheduleBlock_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SchedulerResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerScheduleBlock" ADD CONSTRAINT "SchedulerScheduleBlock_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerScheduleBlock" ADD CONSTRAINT "SchedulerScheduleBlock_canceledByUserId_fkey" FOREIGN KEY ("canceledByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerIdempotencyKey" ADD CONSTRAINT "SchedulerIdempotencyKey_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerIdempotencyKey" ADD CONSTRAINT "SchedulerIdempotencyKey_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "SchedulerAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_schedulerAppointmentId_fkey" FOREIGN KEY ("schedulerAppointmentId") REFERENCES "SchedulerAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "scheduler_reject_history_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Scheduler appointment history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SchedulerAppointmentStateHistory_append_only"
BEFORE UPDATE OR DELETE ON "SchedulerAppointmentStateHistory"
FOR EACH ROW EXECUTE FUNCTION "scheduler_reject_history_mutation"();

CREATE TRIGGER "SchedulerIdempotencyKey_append_only"
BEFORE UPDATE OR DELETE ON "SchedulerIdempotencyKey"
FOR EACH ROW EXECUTE FUNCTION "scheduler_reject_history_mutation"();
