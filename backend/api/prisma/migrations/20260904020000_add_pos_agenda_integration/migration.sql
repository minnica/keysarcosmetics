-- Fase 11 POS: integración transaccional con Agenda CRM.
-- Migración aditiva; no crea reservas, clientes ni datos operativos.

ALTER TYPE "PosAppointmentStatus" ADD VALUE 'NO_SHOW';

CREATE TYPE "AgendaResourceType" AS ENUM ('INDIVIDUAL', 'DOUBLE');
CREATE TYPE "AgendaSlotStatus" AS ENUM ('AVAILABLE', 'CANCELED', 'BOOKED', 'BLOCKED');
CREATE TYPE "AgendaReservationMode" AS ENUM ('SINGLE', 'SIMULTANEOUS_DOUBLE', 'CONSECUTIVE');
CREATE TYPE "AgendaReservationStatus" AS ENUM ('INTENT', 'REMOTE_RESERVED', 'CONFIRMED', 'CANCEL_PENDING', 'CANCELED', 'CONFLICT', 'FAILED');
CREATE TYPE "AgendaSyncDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "AgendaSyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'IGNORED', 'FAILED', 'CONFLICT');
CREATE TYPE "AgendaSyncEventType" AS ENUM ('CLIENT_UPSERT', 'CLIENT_UPDATE', 'RESERVATION_CREATE', 'RESERVATION_CANCEL', 'ATTENDED', 'CANCELED', 'NO_SHOW', 'ATTENDANCE_CORRECTION');

ALTER TABLE "Customer" ADD COLUMN "externalClientId" VARCHAR(160);
CREATE UNIQUE INDEX "Customer_externalClientId_key" ON "Customer"("externalClientId");

CREATE TABLE "AgendaResource" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "branchId" TEXT NOT NULL,
  "externalResourceId" VARCHAR(160) NOT NULL,
  "externalCalendarId" VARCHAR(160),
  "nameSnapshot" VARCHAR(240) NOT NULL,
  "type" "AgendaResourceType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgendaResource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgendaResource_version_check" CHECK ("version" > 0)
);

CREATE TABLE "AgendaSlot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "resourceId" UUID NOT NULL,
  "externalSlotId" VARCHAR(160) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "reservedCount" INTEGER NOT NULL,
  "status" "AgendaSlotStatus" NOT NULL,
  "sourceVersion" INTEGER NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgendaSlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgendaSlot_capacity_check" CHECK (
    "endsAt" > "startsAt" AND
    "capacity" > 0 AND
    "reservedCount" >= 0 AND
    "reservedCount" <= "capacity" AND
    "sourceVersion" > 0
  )
);

CREATE TABLE "AgendaReservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "operationKey" UUID NOT NULL,
  "groupOrdinal" INTEGER NOT NULL,
  "idempotencyKey" VARCHAR(200) NOT NULL,
  "status" "AgendaReservationStatus" NOT NULL DEFAULT 'INTENT',
  "mode" "AgendaReservationMode" NOT NULL,
  "seats" INTEGER NOT NULL,
  "branchId" TEXT NOT NULL,
  "customerId" TEXT,
  "ticketId" UUID,
  "resourceId" UUID NOT NULL,
  "primarySlotId" UUID NOT NULL,
  "slotIdsSnapshot" JSONB NOT NULL,
  "externalClientId" VARCHAR(160),
  "externalReservationId" VARCHAR(160),
  "externalReservationIdsSnapshot" JSONB,
  "externalAppointmentIdsSnapshot" JSONB,
  "externalVersionsSnapshot" JSONB,
  "expectedVersion" INTEGER NOT NULL,
  "remoteVersion" INTEGER,
  "failureCode" VARCHAR(120),
  "failureMessage" VARCHAR(500),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgendaReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgendaReservation_values_check" CHECK (
    "groupOrdinal" > 0 AND "seats" > 0 AND "expectedVersion" > 0 AND
    ("remoteVersion" IS NULL OR "remoteVersion" > 0)
  )
);

CREATE TABLE "AgendaSyncEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "providerEventId" VARCHAR(200),
  "type" "AgendaSyncEventType" NOT NULL,
  "direction" "AgendaSyncDirection" NOT NULL,
  "status" "AgendaSyncStatus" NOT NULL DEFAULT 'PENDING',
  "reservationId" UUID,
  "appointmentId" UUID,
  "customerId" TEXT,
  "sourceVersion" INTEGER,
  "payloadHash" VARCHAR(64) NOT NULL,
  "normalizedPayload" JSONB,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastErrorCode" VARCHAR(120),
  "lastErrorMessage" VARCHAR(500),
  "resolvedByCredentialId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgendaSyncEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgendaSyncEvent_values_check" CHECK (
    "retryCount" >= 0 AND ("sourceVersion" IS NULL OR "sourceVersion" > 0)
  )
);

ALTER TABLE "PosAppointment"
  ADD COLUMN "externalReservationId" VARCHAR(160),
  ADD COLUMN "externalAppointmentId" VARCHAR(160),
  ADD COLUMN "agendaResourceId" UUID,
  ADD COLUMN "agendaSlotId" UUID,
  ADD COLUMN "agendaReservationId" UUID,
  ADD COLUMN "agendaVersion" INTEGER,
  ADD COLUMN "capacitySnapshot" INTEGER,
  ADD COLUMN "startsAtSnapshot" TIMESTAMP(3),
  ADD COLUMN "endsAtSnapshot" TIMESTAMP(3),
  ADD COLUMN "membershipId" UUID,
  ADD COLUMN "courtesyReason" VARCHAR(40),
  ADD CONSTRAINT "PosAppointment_agenda_snapshot_check" CHECK (
    ("agendaReservationId" IS NULL AND "externalReservationId" IS NULL AND "externalAppointmentId" IS NULL AND "agendaResourceId" IS NULL AND "agendaSlotId" IS NULL AND "agendaVersion" IS NULL AND "capacitySnapshot" IS NULL AND "startsAtSnapshot" IS NULL AND "endsAtSnapshot" IS NULL) OR
    ("agendaReservationId" IS NOT NULL AND "externalReservationId" IS NOT NULL AND "externalAppointmentId" IS NOT NULL AND "agendaResourceId" IS NOT NULL AND "agendaSlotId" IS NOT NULL AND "agendaVersion" IS NOT NULL AND "agendaVersion" > 0 AND "capacitySnapshot" IS NOT NULL AND "capacitySnapshot" > 0 AND "startsAtSnapshot" IS NOT NULL AND "endsAtSnapshot" IS NOT NULL AND "endsAtSnapshot" > "startsAtSnapshot")
  ),
  ADD CONSTRAINT "PosAppointment_benefit_source_check" CHECK (
    NOT ("membershipId" IS NOT NULL AND "courtesyReason" IS NOT NULL) AND
    ("courtesyReason" IS NULL OR "courtesyReason" IN ('WELCOME', 'COMPLAINT'))
  );

ALTER TABLE "PosMembershipAttendance"
  ALTER COLUMN "recordedByCredentialId" DROP NOT NULL,
  ADD COLUMN "agendaSyncEventId" UUID,
  ADD CONSTRAINT "PosMembershipAttendance_actor_check" CHECK (
    ("recordedByCredentialId" IS NOT NULL)::integer + ("agendaSyncEventId" IS NOT NULL)::integer = 1
  );

CREATE TABLE "PosMembershipAttendanceCorrection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attendanceId" UUID NOT NULL,
  "agendaSyncEventId" UUID NOT NULL,
  "sessionDelta" INTEGER NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "authorizationId" TEXT NOT NULL,
  "correctedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosMembershipAttendanceCorrection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosMembershipAttendanceCorrection_delta_check" CHECK ("sessionDelta" IN (-1, 1))
);

CREATE UNIQUE INDEX "AgendaResource_externalResourceId_key" ON "AgendaResource"("externalResourceId");
CREATE INDEX "AgendaResource_branchId_active_idx" ON "AgendaResource"("branchId", "active");
CREATE UNIQUE INDEX "AgendaSlot_externalSlotId_key" ON "AgendaSlot"("externalSlotId");
CREATE UNIQUE INDEX "AgendaSlot_resourceId_startsAt_endsAt_key" ON "AgendaSlot"("resourceId", "startsAt", "endsAt");
CREATE INDEX "AgendaSlot_startsAt_endsAt_status_idx" ON "AgendaSlot"("startsAt", "endsAt", "status");
CREATE UNIQUE INDEX "AgendaReservation_idempotencyKey_key" ON "AgendaReservation"("idempotencyKey");
CREATE UNIQUE INDEX "AgendaReservation_externalReservationId_key" ON "AgendaReservation"("externalReservationId");
CREATE UNIQUE INDEX "AgendaReservation_operationKey_groupOrdinal_key" ON "AgendaReservation"("operationKey", "groupOrdinal");
CREATE INDEX "AgendaReservation_status_actualizadoEn_idx" ON "AgendaReservation"("status", "actualizadoEn");
CREATE INDEX "AgendaReservation_branchId_creadoEn_idx" ON "AgendaReservation"("branchId", "creadoEn");
CREATE INDEX "AgendaReservation_customerId_creadoEn_idx" ON "AgendaReservation"("customerId", "creadoEn");
CREATE UNIQUE INDEX "AgendaSyncEvent_providerEventId_key" ON "AgendaSyncEvent"("providerEventId");
CREATE INDEX "AgendaSyncEvent_status_nextAttemptAt_creadoEn_idx" ON "AgendaSyncEvent"("status", "nextAttemptAt", "creadoEn");
CREATE INDEX "AgendaSyncEvent_appointmentId_sourceVersion_idx" ON "AgendaSyncEvent"("appointmentId", "sourceVersion");
CREATE INDEX "AgendaSyncEvent_customerId_creadoEn_idx" ON "AgendaSyncEvent"("customerId", "creadoEn");
CREATE UNIQUE INDEX "PosAppointment_externalAppointmentId_key" ON "PosAppointment"("externalAppointmentId");
CREATE INDEX "PosAppointment_externalReservationId_idx" ON "PosAppointment"("externalReservationId");
CREATE INDEX "PosAppointment_agendaReservationId_idx" ON "PosAppointment"("agendaReservationId");
CREATE INDEX "PosAppointment_membershipId_status_idx" ON "PosAppointment"("membershipId", "status");
CREATE UNIQUE INDEX "PosMembershipAttendance_agendaSyncEventId_key" ON "PosMembershipAttendance"("agendaSyncEventId");
CREATE UNIQUE INDEX "PosMembershipAttendanceCorrection_agendaSyncEventId_key" ON "PosMembershipAttendanceCorrection"("agendaSyncEventId");
CREATE INDEX "PosMembershipAttendanceCorrection_actorCredentialId_correctedAt_idx" ON "PosMembershipAttendanceCorrection"("actorCredentialId", "correctedAt");
CREATE INDEX "PosMembershipAttendanceCorrection_attendanceId_correctedAt_idx" ON "PosMembershipAttendanceCorrection"("attendanceId", "correctedAt");

ALTER TABLE "AgendaResource" ADD CONSTRAINT "AgendaResource_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaSlot" ADD CONSTRAINT "AgendaSlot_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "AgendaResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaReservation" ADD CONSTRAINT "AgendaReservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaReservation" ADD CONSTRAINT "AgendaReservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaReservation" ADD CONSTRAINT "AgendaReservation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaReservation" ADD CONSTRAINT "AgendaReservation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "AgendaResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaReservation" ADD CONSTRAINT "AgendaReservation_primarySlotId_fkey" FOREIGN KEY ("primarySlotId") REFERENCES "AgendaSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_agendaResourceId_fkey" FOREIGN KEY ("agendaResourceId") REFERENCES "AgendaResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_agendaSlotId_fkey" FOREIGN KEY ("agendaSlotId") REFERENCES "AgendaSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_agendaReservationId_fkey" FOREIGN KEY ("agendaReservationId") REFERENCES "AgendaReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosAppointment" ADD CONSTRAINT "PosAppointment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "PosClientMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaSyncEvent" ADD CONSTRAINT "AgendaSyncEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "AgendaReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaSyncEvent" ADD CONSTRAINT "AgendaSyncEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "PosAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaSyncEvent" ADD CONSTRAINT "AgendaSyncEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgendaSyncEvent" ADD CONSTRAINT "AgendaSyncEvent_resolvedByCredentialId_fkey" FOREIGN KEY ("resolvedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendance" ADD CONSTRAINT "PosMembershipAttendance_agendaSyncEventId_fkey" FOREIGN KEY ("agendaSyncEventId") REFERENCES "AgendaSyncEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendanceCorrection" ADD CONSTRAINT "PosMembershipAttendanceCorrection_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "PosMembershipAttendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendanceCorrection" ADD CONSTRAINT "PosMembershipAttendanceCorrection_agendaSyncEventId_fkey" FOREIGN KEY ("agendaSyncEventId") REFERENCES "AgendaSyncEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendanceCorrection" ADD CONSTRAINT "PosMembershipAttendanceCorrection_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendanceCorrection" ADD CONSTRAINT "PosMembershipAttendanceCorrection_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "MasterAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "protect_agenda_reservation_identity"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AgendaReservation cannot be deleted';
  END IF;
  IF (
    to_jsonb(NEW) - ARRAY['status', 'customerId', 'ticketId', 'externalClientId', 'externalReservationId', 'externalReservationIdsSnapshot', 'externalAppointmentIdsSnapshot', 'externalVersionsSnapshot', 'remoteVersion', 'failureCode', 'failureMessage', 'actualizadoEn']::text[]
    <>
    to_jsonb(OLD) - ARRAY['status', 'customerId', 'ticketId', 'externalClientId', 'externalReservationId', 'externalReservationIdsSnapshot', 'externalAppointmentIdsSnapshot', 'externalVersionsSnapshot', 'remoteVersion', 'failureCode', 'failureMessage', 'actualizadoEn']::text[]
  ) THEN
    RAISE EXCEPTION 'AgendaReservation identity and slot snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AgendaReservation_protect_identity" BEFORE UPDATE OR DELETE ON "AgendaReservation" FOR EACH ROW EXECUTE FUNCTION "protect_agenda_reservation_identity"();
CREATE TRIGGER "PosMembershipAttendanceCorrection_append_only" BEFORE UPDATE OR DELETE ON "PosMembershipAttendanceCorrection" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_membership_history_mutation"();
