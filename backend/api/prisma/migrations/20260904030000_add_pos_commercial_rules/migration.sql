-- Fase 12 POS: pagos enriquecidos, cortesías versionadas, cartera y participantes.
-- Migración aditiva. Sólo incorpora catálogos técnicos validados; no crea ventas,
-- clientes, membresías, citas ni otros datos operativos.

CREATE TYPE "PosCardType" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "PosCatalogChangeAction" AS ENUM ('CREATED', 'UPDATED', 'INACTIVATED', 'REACTIVATED');
CREATE TYPE "PosCourtesyProductType" AS ENUM ('FACIAL', 'BODY');
CREATE TYPE "PosTicketParticipantKind" AS ENUM ('SELLER', 'COMPANY');

ALTER TABLE "CustomerSource" ADD COLUMN "companyOwnedByDefault" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PosCommercialCompany" (
  "id" TEXT NOT NULL,
  "salesNumber" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosCommercialCompany_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosCommercialCompany_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "PosCommercialCompany_salesNumber_key" ON "PosCommercialCompany"("salesNumber");

INSERT INTO "PosCommercialCompany" ("id", "salesNumber", "name", "actualizadoEn")
VALUES ('keysar-commercial-company', 'EMPRESA-001', 'KEYSAR COSMETICS', CURRENT_TIMESTAMP);

ALTER TABLE "CustomerPortfolioAssignment"
  ADD COLUMN "companyId" TEXT,
  ADD COLUMN "ownerNameSnapshot" VARCHAR(240),
  ADD COLUMN "ownerCodeSnapshot" VARCHAR(80),
  ADD COLUMN "endedReason" VARCHAR(120),
  ADD CONSTRAINT "CustomerPortfolioAssignment_owner_check" CHECK (NOT ("employeeId" IS NOT NULL AND "companyId" IS NOT NULL));
CREATE INDEX "CustomerPortfolioAssignment_companyId_effectiveTo_idx" ON "CustomerPortfolioAssignment"("companyId", "effectiveTo");
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PosCommercialCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PosPortfolioTransferEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customerId" TEXT NOT NULL,
  "branchId" TEXT,
  "sellerId" TEXT NOT NULL,
  "sellerNameSnapshot" VARCHAR(240) NOT NULL,
  "companyId" TEXT NOT NULL,
  "companyNameSnapshot" VARCHAR(160) NOT NULL,
  "companyNumberSnapshot" VARCHAR(80) NOT NULL,
  "reason" VARCHAR(120) NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosPortfolioTransferEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PosPortfolioTransferEvent_customerId_transferredAt_idx" ON "PosPortfolioTransferEvent"("customerId", "transferredAt");
CREATE INDEX "PosPortfolioTransferEvent_sellerId_transferredAt_idx" ON "PosPortfolioTransferEvent"("sellerId", "transferredAt");
ALTER TABLE "PosPortfolioTransferEvent" ADD CONSTRAINT "PosPortfolioTransferEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPortfolioTransferEvent" ADD CONSTRAINT "PosPortfolioTransferEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPortfolioTransferEvent" ADD CONSTRAINT "PosPortfolioTransferEvent_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPortfolioTransferEvent" ADD CONSTRAINT "PosPortfolioTransferEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PosCommercialCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPortfolioTransferEvent" ADD CONSTRAINT "PosPortfolioTransferEvent_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PosBank" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "normalizedName" VARCHAR(220) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sourceName" VARCHAR(120) NOT NULL,
  "sourceReviewedAt" DATE NOT NULL,
  "createdByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosBank_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosBank_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "PosBank_normalizedName_key" ON "PosBank"("normalizedName");
CREATE INDEX "PosBank_active_name_idx" ON "PosBank"("active", "name");

CREATE TABLE "PosBankChange" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bankId" TEXT NOT NULL,
  "action" "PosCatalogChangeAction" NOT NULL,
  "version" INTEGER NOT NULL,
  "previousSnapshot" JSONB,
  "nextSnapshot" JSONB NOT NULL,
  "actorCredentialId" TEXT,
  "cambiadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosBankChange_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosBankChange_bankId_version_key" ON "PosBankChange"("bankId", "version");
ALTER TABLE "PosBankChange" ADD CONSTRAINT "PosBankChange_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "PosBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosBankChange" ADD CONSTRAINT "PosBankChange_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PosCardNetwork" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "normalizedName" VARCHAR(140) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sourceName" VARCHAR(120) NOT NULL,
  "sourceReviewedAt" DATE NOT NULL,
  "createdByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosCardNetwork_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosCardNetwork_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "PosCardNetwork_normalizedName_key" ON "PosCardNetwork"("normalizedName");

CREATE TABLE "PosCardNetworkChange" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "networkId" TEXT NOT NULL,
  "action" "PosCatalogChangeAction" NOT NULL,
  "version" INTEGER NOT NULL,
  "previousSnapshot" JSONB,
  "nextSnapshot" JSONB NOT NULL,
  "actorCredentialId" TEXT,
  "cambiadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosCardNetworkChange_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosCardNetworkChange_networkId_version_key" ON "PosCardNetworkChange"("networkId", "version");
ALTER TABLE "PosCardNetworkChange" ADD CONSTRAINT "PosCardNetworkChange_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "PosCardNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCardNetworkChange" ADD CONSTRAINT "PosCardNetworkChange_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PosInstallmentOption" (
  "id" TEXT NOT NULL,
  "months" INTEGER NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sourceName" VARCHAR(120) NOT NULL,
  "sourceReviewedAt" DATE NOT NULL,
  "createdByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosInstallmentOption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosInstallmentOption_values_check" CHECK ("months" > 0 AND "version" > 0)
);
CREATE UNIQUE INDEX "PosInstallmentOption_months_key" ON "PosInstallmentOption"("months");

CREATE TABLE "PosInstallmentOptionChange" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "optionId" TEXT NOT NULL,
  "action" "PosCatalogChangeAction" NOT NULL,
  "version" INTEGER NOT NULL,
  "previousSnapshot" JSONB,
  "nextSnapshot" JSONB NOT NULL,
  "actorCredentialId" TEXT,
  "cambiadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosInstallmentOptionChange_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosInstallmentOptionChange_optionId_version_key" ON "PosInstallmentOptionChange"("optionId", "version");
ALTER TABLE "PosInstallmentOptionChange" ADD CONSTRAINT "PosInstallmentOptionChange_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PosInstallmentOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosInstallmentOptionChange" ADD CONSTRAINT "PosInstallmentOptionChange_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "PosCardNetwork" ("id", "name", "normalizedName", "sourceName", "sourceReviewedAt", "actualizadoEn") VALUES
  ('VISA', 'Visa', 'visa', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MASTERCARD', 'Mastercard', 'mastercard', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP);

INSERT INTO "PosInstallmentOption" ("id", "months", "label", "sourceName", "sourceReviewedAt", "actualizadoEn") VALUES
  ('MONTHS-01', 1, 'Una exhibición', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MONTHS-03', 3, '3 MSI', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MONTHS-06', 6, '6 MSI', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MONTHS-09', 9, '9 MSI', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MONTHS-12', 12, '12 MSI', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MONTHS-18', 18, '18 MSI', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MONTHS-24', 24, '24 MSI', 'KEYSAR POS', DATE '2026-09-04', CURRENT_TIMESTAMP);

INSERT INTO "PosBank" ("id", "name", "normalizedName", "sourceName", "sourceReviewedAt", "actualizadoEn") VALUES
  ('MX-BANK-001', 'Banca Afirme', 'banca afirme', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-002', 'Banca Mifel', 'banca mifel', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-003', 'Banco Actinver', 'banco actinver', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-004', 'Banco Azteca', 'banco azteca', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-005', 'Banco Bancrea', 'banco bancrea', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-006', 'Banco Base', 'banco base', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-007', 'Banco Bineo', 'banco bineo', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-008', 'Banco Citi México', 'banco citi mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-009', 'Banco Compartamos', 'banco compartamos', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-010', 'Banco Covalto', 'banco covalto', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-011', 'Banco Credit Suisse (México)', 'banco credit suisse (mexico)', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-012', 'Banco de Inversión Afirme', 'banco de inversion afirme', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-013', 'Banco del Bajío', 'banco del bajio', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-014', 'Banco BanFeliz', 'banco banfeliz', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-015', 'Banco Inbursa', 'banco inbursa', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-016', 'Banco Inmobiliario Mexicano', 'banco inmobiliario mexicano', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-017', 'Banco Invex', 'banco invex', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-018', 'Banco JP Morgan', 'banco jp morgan', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-019', 'Banco KEB Hana México', 'banco keb hana mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-020', 'Banco Monex', 'banco monex', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-021', 'Banco Multiva', 'banco multiva', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-022', 'Banco Nacional de México', 'banco nacional de mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-023', 'Banco PagaTodo', 'banco pagatodo', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-024', 'Banco Plata', 'banco plata', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-025', 'Banco Regional de Monterrey', 'banco regional de monterrey', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-026', 'Banco S3 Caceis México', 'banco s3 caceis mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-027', 'Banco Sabadell', 'banco sabadell', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-028', 'Banco Santander', 'banco santander', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-029', 'Banco Shinhan de México', 'banco shinhan de mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-030', 'Banco Ve por Más', 'banco ve por mas', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-031', 'BanCoppel', 'bancoppel', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-032', 'Bank of America Mexico', 'bank of america mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-033', 'Bank of China Mexico', 'bank of china mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-034', 'Bankaool', 'bankaool', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-035', 'Banorte', 'banorte', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-036', 'Bansí', 'bansi', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-037', 'Barclays Bank México', 'barclays bank mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-038', 'BBVA México', 'bbva mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-039', 'BNP Paribas', 'bnp paribas', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-040', 'Consubanco', 'consubanco', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-041', 'Fundación Dondé Banco', 'fundacion donde banco', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-042', 'Hey Banco', 'hey banco', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-043', 'HSBC México', 'hsbc mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-044', 'Industrial and Commercial Bank of China', 'industrial and commercial bank of china', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-045', 'Intercam Banco', 'intercam banco', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-046', 'Kapital Bank', 'kapital bank', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-047', 'Mizuho Bank', 'mizuho bank', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-048', 'MUFG Bank Mexico', 'mufg bank mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-049', 'Nu México', 'nu mexico', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-050', 'Openbank', 'openbank', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-051', 'Revolut', 'revolut', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-052', 'Scotiabank', 'scotiabank', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-053', 'UALÁ', 'uala', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP),
  ('MX-BANK-054', 'Volkswagen Bank', 'volkswagen bank', 'ABM', DATE '2026-09-04', CURRENT_TIMESTAMP);

INSERT INTO "PosBankChange" ("bankId", "action", "version", "nextSnapshot")
SELECT "id", 'CREATED', 1, jsonb_build_object('name', "name", 'active', "active", 'sourceName', "sourceName", 'sourceReviewedAt', "sourceReviewedAt") FROM "PosBank";
INSERT INTO "PosCardNetworkChange" ("networkId", "action", "version", "nextSnapshot")
SELECT "id", 'CREATED', 1, jsonb_build_object('name', "name", 'active', "active", 'sourceName', "sourceName", 'sourceReviewedAt', "sourceReviewedAt") FROM "PosCardNetwork";
INSERT INTO "PosInstallmentOptionChange" ("optionId", "action", "version", "nextSnapshot")
SELECT "id", 'CREATED', 1, jsonb_build_object('months', "months", 'label', "label", 'active', "active", 'sourceName', "sourceName", 'sourceReviewedAt', "sourceReviewedAt") FROM "PosInstallmentOption";

ALTER TABLE "PosPayment"
  ADD COLUMN "cardType" "PosCardType",
  ADD COLUMN "cardNetworkId" TEXT,
  ADD COLUMN "cardNetworkNameSnapshot" VARCHAR(120),
  ADD COLUMN "bankId" TEXT,
  ADD COLUMN "bankNameSnapshot" VARCHAR(200),
  ADD COLUMN "installmentMonths" INTEGER,
  ADD CONSTRAINT "PosPayment_commercial_details_check" CHECK (
    ("cardType" IS NULL AND "cardNetworkId" IS NULL AND "cardNetworkNameSnapshot" IS NULL AND "installmentMonths" IS NULL) OR
    ("cardType" = 'DEBIT' AND "cardNetworkId" IS NOT NULL AND "cardNetworkNameSnapshot" IS NOT NULL AND "bankId" IS NOT NULL AND "bankNameSnapshot" IS NOT NULL AND "installmentMonths" IS NULL) OR
    ("cardType" = 'CREDIT' AND "cardNetworkId" IS NOT NULL AND "cardNetworkNameSnapshot" IS NOT NULL AND "bankId" IS NOT NULL AND "bankNameSnapshot" IS NOT NULL AND "installmentMonths" IS NOT NULL AND "installmentMonths" > 0)
  );
CREATE INDEX "PosPayment_bankId_creadoEn_idx" ON "PosPayment"("bankId", "creadoEn");
CREATE INDEX "PosPayment_cardNetworkId_creadoEn_idx" ON "PosPayment"("cardNetworkId", "creadoEn");
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_cardNetworkId_fkey" FOREIGN KEY ("cardNetworkId") REFERENCES "PosCardNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "PosBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PosTicketParticipant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" UUID NOT NULL,
  "kind" "PosTicketParticipantKind" NOT NULL,
  "employeeId" TEXT,
  "companyId" TEXT,
  "participantCodeSnapshot" VARCHAR(80) NOT NULL,
  "participantNameSnapshot" VARCHAR(240) NOT NULL,
  "shareAmount" DECIMAL(14,2) NOT NULL,
  "sharePercent" DECIMAL(8,4) NOT NULL,
  "clockedInSnapshot" BOOLEAN NOT NULL DEFAULT false,
  "presenceBranchIdSnapshot" TEXT,
  "attendanceIdSnapshot" UUID,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosTicketParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosTicketParticipant_identity_check" CHECK (
    ("kind" = 'SELLER' AND "employeeId" IS NOT NULL AND "companyId" IS NULL) OR
    ("kind" = 'COMPANY' AND "employeeId" IS NULL AND "companyId" IS NOT NULL)
  ),
  CONSTRAINT "PosTicketParticipant_share_check" CHECK ("shareAmount" > 0 AND "sharePercent" >= 0 AND "sharePercent" <= 100)
);
CREATE INDEX "PosTicketParticipant_ticketId_kind_idx" ON "PosTicketParticipant"("ticketId", "kind");
CREATE UNIQUE INDEX "PosTicketParticipant_ticketId_employeeId_key" ON "PosTicketParticipant"("ticketId", "employeeId");
CREATE UNIQUE INDEX "PosTicketParticipant_ticketId_companyId_key" ON "PosTicketParticipant"("ticketId", "companyId");
CREATE INDEX "PosTicketParticipant_employeeId_creadoEn_idx" ON "PosTicketParticipant"("employeeId", "creadoEn");
CREATE INDEX "PosTicketParticipant_companyId_creadoEn_idx" ON "PosTicketParticipant"("companyId", "creadoEn");
ALTER TABLE "PosTicketParticipant" ADD CONSTRAINT "PosTicketParticipant_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PosTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketParticipant" ADD CONSTRAINT "PosTicketParticipant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosTicketParticipant" ADD CONSTRAINT "PosTicketParticipant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PosCommercialCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "PosTicketParticipant" ("ticketId", "kind", "employeeId", "participantCodeSnapshot", "participantNameSnapshot", "shareAmount", "sharePercent", "clockedInSnapshot", "presenceBranchIdSnapshot", "attendanceIdSnapshot", "creadoEn")
SELECT "ticketId", 'SELLER', "employeeId", "employeeId", "sellerNameSnapshot", "shareAmount", "sharePercent", "clockedInSnapshot", "presenceBranchIdSnapshot", "attendanceIdSnapshot", "creadoEn"
FROM "PosTicketSeller";

CREATE TABLE "PosCourtesyProduct" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "type" "PosCourtesyProductType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosCourtesyProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosCourtesyProduct_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "PosCourtesyProduct_normalizedName_key" ON "PosCourtesyProduct"("normalizedName");

CREATE TABLE "PosCourtesyProductVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "nameSnapshot" VARCHAR(160) NOT NULL,
  "typeSnapshot" "PosCourtesyProductType" NOT NULL,
  "activeSnapshot" BOOLEAN NOT NULL,
  "actorCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosCourtesyProductVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosCourtesyProductVersion_productId_version_key" ON "PosCourtesyProductVersion"("productId", "version");

CREATE TABLE "PosCourtesyPackage" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosCourtesyPackage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosCourtesyPackage_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "PosCourtesyPackage_normalizedName_key" ON "PosCourtesyPackage"("normalizedName");

CREATE TABLE "PosCourtesyPackageLine" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "PosCourtesyPackageLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosCourtesyPackageLine_packageId_sortOrder_key" ON "PosCourtesyPackageLine"("packageId", "sortOrder");

CREATE TABLE "PosCourtesyPackageVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "packageId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "nameSnapshot" VARCHAR(160) NOT NULL,
  "activeSnapshot" BOOLEAN NOT NULL,
  "linesSnapshot" JSONB NOT NULL,
  "actorCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosCourtesyPackageVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosCourtesyPackageVersion_packageId_version_key" ON "PosCourtesyPackageVersion"("packageId", "version");

CREATE TABLE "PosCourtesyCheckoutConfiguration" (
  "id" TEXT NOT NULL,
  "branchId" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "defaultPackageId" TEXT,
  "defaultPackageVersion" INTEGER,
  "updatedByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosCourtesyCheckoutConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosCourtesyCheckoutConfiguration_default_check" CHECK (("defaultPackageId" IS NULL) = ("defaultPackageVersion" IS NULL))
);
CREATE UNIQUE INDEX "PosCourtesyCheckoutConfiguration_branchId_key" ON "PosCourtesyCheckoutConfiguration"("branchId");

ALTER TABLE "PosCourtesyProductVersion" ADD CONSTRAINT "PosCourtesyProductVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PosCourtesyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesyProductVersion" ADD CONSTRAINT "PosCourtesyProductVersion_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesyPackageLine" ADD CONSTRAINT "PosCourtesyPackageLine_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PosCourtesyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosCourtesyPackageLine" ADD CONSTRAINT "PosCourtesyPackageLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PosCourtesyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesyPackageVersion" ADD CONSTRAINT "PosCourtesyPackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PosCourtesyPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesyPackageVersion" ADD CONSTRAINT "PosCourtesyPackageVersion_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesyCheckoutConfiguration" ADD CONSTRAINT "PosCourtesyCheckoutConfiguration_defaultPackageId_fkey" FOREIGN KEY ("defaultPackageId") REFERENCES "PosCourtesyPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosCourtesy"
  ADD COLUMN "courtesyProductId" TEXT,
  ADD COLUMN "productNameSnapshot" VARCHAR(160),
  ADD COLUMN "productTypeSnapshot" "PosCourtesyProductType",
  ADD COLUMN "courtesyPackageId" TEXT,
  ADD COLUMN "packageVersionSnapshot" INTEGER,
  ADD COLUMN "packageNameSnapshot" VARCHAR(160);
ALTER TABLE "PosCourtesy" ADD CONSTRAINT "PosCourtesy_courtesyProductId_fkey" FOREIGN KEY ("courtesyProductId") REFERENCES "PosCourtesyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCourtesy" ADD CONSTRAINT "PosCourtesy_courtesyPackageId_fkey" FOREIGN KEY ("courtesyPackageId") REFERENCES "PosCourtesyPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "prevent_pos_commercial_history_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PosBankChange_append_only" BEFORE UPDATE OR DELETE ON "PosBankChange" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_commercial_history_mutation"();
CREATE TRIGGER "PosCardNetworkChange_append_only" BEFORE UPDATE OR DELETE ON "PosCardNetworkChange" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_commercial_history_mutation"();
CREATE TRIGGER "PosInstallmentOptionChange_append_only" BEFORE UPDATE OR DELETE ON "PosInstallmentOptionChange" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_commercial_history_mutation"();
CREATE TRIGGER "PosCourtesyProductVersion_append_only" BEFORE UPDATE OR DELETE ON "PosCourtesyProductVersion" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_commercial_history_mutation"();
CREATE TRIGGER "PosCourtesyPackageVersion_append_only" BEFORE UPDATE OR DELETE ON "PosCourtesyPackageVersion" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_commercial_history_mutation"();
CREATE TRIGGER "PosPortfolioTransferEvent_append_only" BEFORE UPDATE OR DELETE ON "PosPortfolioTransferEvent" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_commercial_history_mutation"();
CREATE TRIGGER "PosTicketParticipant_append_only" BEFORE UPDATE OR DELETE ON "PosTicketParticipant" FOR EACH ROW EXECUTE FUNCTION "prevent_pos_commercial_history_mutation"();
