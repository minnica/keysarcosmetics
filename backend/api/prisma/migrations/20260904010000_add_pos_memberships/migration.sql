-- Fase 10 POS: membresías, tarjetones, asistencias y cierres comerciales.
-- Migración exclusivamente aditiva; no crea membresías, ventas ni datos demo.

ALTER TYPE "CatalogItemKind" ADD VALUE 'MEMBERSHIP';

CREATE TYPE "PosMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXHAUSTED', 'CANCELED');
CREATE TYPE "PosMembershipClientProfile" AS ENUM ('POTENTIAL', 'LOYAL', 'VIP', 'RECOVERY');
CREATE TYPE "PosMembershipSignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'NOT_REQUIRED');

CREATE SEQUENCE "PosMembershipFolioSeq" START 1;
CREATE SEQUENCE "PosMembershipSkuSeq" START 1;

CREATE TABLE "PosMembershipTerms" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "totalSessions" INTEGER NOT NULL,
  "renewalThreshold" INTEGER NOT NULL DEFAULT 2,
  "conditions" JSONB,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosMembershipTerms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosMembershipTerms_sessions_check" CHECK (
    "totalSessions" > 0 AND
    "renewalThreshold" >= 0 AND
    "renewalThreshold" <= "totalSessions"
  )
);

CREATE TABLE "PosClientMembership" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "folio" VARCHAR(80) NOT NULL,
  "ticketId" UUID NOT NULL,
  "ticketLineId" TEXT NOT NULL,
  "unitOrdinal" INTEGER NOT NULL,
  "customerId" TEXT NOT NULL,
  "customerNameSnapshot" VARCHAR(240) NOT NULL,
  "customerPhoneSnapshot" VARCHAR(32),
  "membershipItemId" TEXT NOT NULL,
  "membershipNameSnapshot" VARCHAR(240) NOT NULL,
  "membershipSkuSnapshot" VARCHAR(96) NOT NULL,
  "termsId" TEXT NOT NULL,
  "termsVersionSnapshot" INTEGER NOT NULL,
  "totalSessions" INTEGER NOT NULL,
  "usedSessions" INTEGER NOT NULL DEFAULT 0,
  "renewalThreshold" INTEGER NOT NULL DEFAULT 2,
  "purchaseAmount" DECIMAL(14,2) NOT NULL,
  "purchaseBranchId" TEXT NOT NULL,
  "purchaseBranchNameSnapshot" VARCHAR(160) NOT NULL,
  "originalSellerId" TEXT,
  "originalSellerNameSnapshot" VARCHAR(240) NOT NULL,
  "currentSellerId" TEXT,
  "currentSellerNameSnapshot" VARCHAR(240) NOT NULL,
  "profile" "PosMembershipClientProfile" NOT NULL DEFAULT 'POTENTIAL',
  "status" "PosMembershipStatus" NOT NULL DEFAULT 'PENDING',
  "activatedAt" TIMESTAMP(3),
  "exhaustedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosClientMembership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosClientMembership_sessions_check" CHECK (
    "unitOrdinal" > 0 AND
    "totalSessions" > 0 AND
    "usedSessions" >= 0 AND
    "usedSessions" <= "totalSessions" AND
    "renewalThreshold" >= 0 AND
    "renewalThreshold" <= "totalSessions"
  ),
  CONSTRAINT "PosClientMembership_status_check" CHECK (
    ("status" = 'PENDING' AND "activatedAt" IS NULL AND "exhaustedAt" IS NULL AND "canceledAt" IS NULL) OR
    ("status" = 'ACTIVE' AND "activatedAt" IS NOT NULL AND "exhaustedAt" IS NULL AND "canceledAt" IS NULL) OR
    ("status" = 'EXHAUSTED' AND "activatedAt" IS NOT NULL AND "usedSessions" = "totalSessions" AND "exhaustedAt" IS NOT NULL AND "canceledAt" IS NULL) OR
    ("status" = 'CANCELED' AND "canceledAt" IS NOT NULL)
  )
);

CREATE TABLE "PosMembershipAttendance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "membershipId" UUID NOT NULL,
  "appointmentId" UUID NOT NULL,
  "sessionNumber" INTEGER NOT NULL,
  "attendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "branchId" TEXT NOT NULL,
  "recordedByCredentialId" TEXT NOT NULL,
  "signatureStatus" "PosMembershipSignatureStatus" NOT NULL DEFAULT 'PENDING',
  "signatureConsentAt" TIMESTAMP(3),
  "signatureEvidenceRef" TEXT,
  "signatureEvidenceHash" VARCHAR(64),
  "signatureEvidenceMetadata" JSONB,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosMembershipAttendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosMembershipAttendance_session_check" CHECK ("sessionNumber" > 0),
  CONSTRAINT "PosMembershipAttendance_signature_check" CHECK (
    "signatureStatus" <> 'SIGNED' OR
    ("signatureConsentAt" IS NOT NULL AND "signatureEvidenceRef" IS NOT NULL AND "signatureEvidenceHash" IS NOT NULL)
  )
);

CREATE TABLE "PosMembershipSellerChange" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "membershipId" UUID NOT NULL,
  "fromSellerId" TEXT,
  "fromSellerNameSnapshot" VARCHAR(240) NOT NULL,
  "toSellerId" TEXT NOT NULL,
  "toSellerNameSnapshot" VARCHAR(240) NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "cambiadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosMembershipSellerChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosMembershipStatusChange" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "membershipId" UUID NOT NULL,
  "fromStatus" "PosMembershipStatus" NOT NULL,
  "toStatus" "PosMembershipStatus" NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "sourceType" VARCHAR(80),
  "sourceId" TEXT,
  "cambiadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosMembershipStatusChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosMembershipStatusChange_transition_check" CHECK ("fromStatus" <> "toStatus")
);

CREATE TABLE "PosMembershipSalesClosure" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "month" DATE NOT NULL,
  "scopeHash" VARCHAR(64) NOT NULL,
  "branchIds" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "membershipCount" INTEGER NOT NULL,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "createdByCredentialId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosMembershipSalesClosure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosMembershipSalesClosure_values_check" CHECK (
    EXTRACT(DAY FROM "month") = 1 AND
    "version" > 0 AND
    "membershipCount" >= 0 AND
    "totalAmount" >= 0
  )
);

CREATE TABLE "PosMembershipSellerRanking" (
  "id" TEXT NOT NULL,
  "closureId" UUID NOT NULL,
  "rank" INTEGER NOT NULL,
  "originalSellerId" TEXT,
  "sellerNameSnapshot" VARCHAR(240) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "PosMembershipSellerRanking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosMembershipSellerRanking_values_check" CHECK (
    "rank" > 0 AND "quantity" > 0 AND "amount" >= 0
  )
);

CREATE UNIQUE INDEX "PosMembershipTerms_itemId_version_key" ON "PosMembershipTerms"("itemId", "version");
CREATE INDEX "PosMembershipTerms_itemId_effectiveAt_idx" ON "PosMembershipTerms"("itemId", "effectiveAt");
CREATE UNIQUE INDEX "PosClientMembership_folio_key" ON "PosClientMembership"("folio");
CREATE UNIQUE INDEX "PosClientMembership_ticketLineId_unitOrdinal_key" ON "PosClientMembership"("ticketLineId", "unitOrdinal");
CREATE INDEX "PosClientMembership_customerId_status_purchasedAt_idx" ON "PosClientMembership"("customerId", "status", "purchasedAt");
CREATE INDEX "PosClientMembership_purchaseBranchId_status_purchasedAt_idx" ON "PosClientMembership"("purchaseBranchId", "status", "purchasedAt");
CREATE INDEX "PosClientMembership_currentSellerId_status_purchasedAt_idx" ON "PosClientMembership"("currentSellerId", "status", "purchasedAt");
CREATE INDEX "PosClientMembership_originalSellerId_purchasedAt_idx" ON "PosClientMembership"("originalSellerId", "purchasedAt");
CREATE UNIQUE INDEX "PosMembershipAttendance_appointmentId_key" ON "PosMembershipAttendance"("appointmentId");
CREATE UNIQUE INDEX "PosMembershipAttendance_membershipId_sessionNumber_key" ON "PosMembershipAttendance"("membershipId", "sessionNumber");
CREATE INDEX "PosMembershipAttendance_branchId_attendedAt_idx" ON "PosMembershipAttendance"("branchId", "attendedAt");
CREATE INDEX "PosMembershipSellerChange_membershipId_cambiadoEn_idx" ON "PosMembershipSellerChange"("membershipId", "cambiadoEn");
CREATE INDEX "PosMembershipSellerChange_toSellerId_cambiadoEn_idx" ON "PosMembershipSellerChange"("toSellerId", "cambiadoEn");
CREATE INDEX "PosMembershipStatusChange_membershipId_cambiadoEn_idx" ON "PosMembershipStatusChange"("membershipId", "cambiadoEn");
CREATE UNIQUE INDEX "PosMembershipSalesClosure_month_scopeHash_version_key" ON "PosMembershipSalesClosure"("month", "scopeHash", "version");
CREATE INDEX "PosMembershipSalesClosure_month_creadoEn_idx" ON "PosMembershipSalesClosure"("month", "creadoEn");
CREATE UNIQUE INDEX "PosMembershipSellerRanking_closureId_rank_key" ON "PosMembershipSellerRanking"("closureId", "rank");
CREATE INDEX "PosMembershipSellerRanking_originalSellerId_closureId_idx" ON "PosMembershipSellerRanking"("originalSellerId", "closureId");

ALTER TABLE "PosMembershipTerms" ADD CONSTRAINT "PosMembershipTerms_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipTerms" ADD CONSTRAINT "PosMembershipTerms_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosClientMembership" ADD CONSTRAINT "PosClientMembership_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosClientMembership" ADD CONSTRAINT "PosClientMembership_ticketLineId_fkey" FOREIGN KEY ("ticketLineId") REFERENCES "PosTicketLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosClientMembership" ADD CONSTRAINT "PosClientMembership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosClientMembership" ADD CONSTRAINT "PosClientMembership_membershipItemId_fkey" FOREIGN KEY ("membershipItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosClientMembership" ADD CONSTRAINT "PosClientMembership_termsId_fkey" FOREIGN KEY ("termsId") REFERENCES "PosMembershipTerms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosClientMembership" ADD CONSTRAINT "PosClientMembership_purchaseBranchId_fkey" FOREIGN KEY ("purchaseBranchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosClientMembership" ADD CONSTRAINT "PosClientMembership_originalSellerId_fkey" FOREIGN KEY ("originalSellerId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosClientMembership" ADD CONSTRAINT "PosClientMembership_currentSellerId_fkey" FOREIGN KEY ("currentSellerId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendance" ADD CONSTRAINT "PosMembershipAttendance_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "PosClientMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendance" ADD CONSTRAINT "PosMembershipAttendance_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "PosAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendance" ADD CONSTRAINT "PosMembershipAttendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipAttendance" ADD CONSTRAINT "PosMembershipAttendance_recordedByCredentialId_fkey" FOREIGN KEY ("recordedByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipSellerChange" ADD CONSTRAINT "PosMembershipSellerChange_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "PosClientMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipSellerChange" ADD CONSTRAINT "PosMembershipSellerChange_fromSellerId_fkey" FOREIGN KEY ("fromSellerId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipSellerChange" ADD CONSTRAINT "PosMembershipSellerChange_toSellerId_fkey" FOREIGN KEY ("toSellerId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipSellerChange" ADD CONSTRAINT "PosMembershipSellerChange_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipStatusChange" ADD CONSTRAINT "PosMembershipStatusChange_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "PosClientMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipStatusChange" ADD CONSTRAINT "PosMembershipStatusChange_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipSalesClosure" ADD CONSTRAINT "PosMembershipSalesClosure_createdByCredentialId_fkey" FOREIGN KEY ("createdByCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipSellerRanking" ADD CONSTRAINT "PosMembershipSellerRanking_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "PosMembershipSalesClosure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipSellerRanking" ADD CONSTRAINT "PosMembershipSellerRanking_originalSellerId_fkey" FOREIGN KEY ("originalSellerId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "prevent_pos_membership_history_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosMembershipTerms_append_only" BEFORE UPDATE OR DELETE ON "PosMembershipTerms" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_membership_history_mutation"();
CREATE TRIGGER "PosMembershipAttendance_append_only" BEFORE UPDATE OR DELETE ON "PosMembershipAttendance" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_membership_history_mutation"();
CREATE TRIGGER "PosMembershipSellerChange_append_only" BEFORE UPDATE OR DELETE ON "PosMembershipSellerChange" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_membership_history_mutation"();
CREATE TRIGGER "PosMembershipStatusChange_append_only" BEFORE UPDATE OR DELETE ON "PosMembershipStatusChange" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_membership_history_mutation"();
CREATE TRIGGER "PosMembershipSalesClosure_append_only" BEFORE UPDATE OR DELETE ON "PosMembershipSalesClosure" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_membership_history_mutation"();
CREATE TRIGGER "PosMembershipSellerRanking_append_only" BEFORE UPDATE OR DELETE ON "PosMembershipSellerRanking" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_membership_history_mutation"();

CREATE FUNCTION "protect_pos_membership_identity"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PosClientMembership cannot be deleted';
  END IF;
  IF (
    to_jsonb(NEW) - ARRAY['usedSessions', 'currentSellerId', 'currentSellerNameSnapshot', 'profile', 'status', 'activatedAt', 'exhaustedAt', 'canceledAt', 'actualizadoEn']::text[]
    <>
    to_jsonb(OLD) - ARRAY['usedSessions', 'currentSellerId', 'currentSellerNameSnapshot', 'profile', 'status', 'activatedAt', 'exhaustedAt', 'canceledAt', 'actualizadoEn']::text[]
  ) THEN
    RAISE EXCEPTION 'PosClientMembership financial and ownership snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosClientMembership_protect_identity" BEFORE UPDATE OR DELETE ON "PosClientMembership" FOR EACH ROW EXECUTE FUNCTION "protect_pos_membership_identity"();
