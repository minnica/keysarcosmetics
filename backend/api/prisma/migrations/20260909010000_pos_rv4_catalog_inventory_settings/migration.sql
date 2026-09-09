ALTER TABLE "CatalogItem"
  ADD COLUMN "groupName" VARCHAR(160),
  ADD COLUMN "showInDigitalCatalog" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "branchRequestVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "unitCostUsd" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "partnerCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "includesVat" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "testerOrderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "presentation" VARCHAR(160),
  ADD COLUMN "unitsPerPackage" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "stockMinimum" DECIMAL(14,2),
  ADD COLUMN "stockMaximum" DECIMAL(14,2);

ALTER TABLE "CatalogTaxonomy" ADD COLUMN "scope" VARCHAR(20) NOT NULL DEFAULT 'FAMILY';
ALTER TABLE "PosPriceListLine" ADD COLUMN "priceUsd" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "PosTicketConfiguration"
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "logoWidth" INTEGER NOT NULL DEFAULT 80;
UPDATE "CatalogTaxonomy" SET "scope" = 'CATEGORY'
WHERE "id" IN (SELECT DISTINCT "categoryId" FROM "CatalogItem" WHERE "categoryId" IS NOT NULL);

ALTER TABLE "Customer"
  ADD COLUMN "firstName" VARCHAR(120),
  ADD COLUMN "lastName" VARCHAR(120),
  ADD COLUMN "birthday" DATE,
  ADD COLUMN "gender" VARCHAR(80),
  ADD COLUMN "whatsapp" VARCHAR(32),
  ADD COLUMN "companyName" VARCHAR(240),
  ADD COLUMN "registrationFolio" VARCHAR(80),
  ADD COLUMN "registrationBranchId" TEXT;

CREATE UNIQUE INDEX "Customer_registrationFolio_key" ON "Customer"("registrationFolio");

CREATE TABLE "PosPackageBranchAssignment" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  CONSTRAINT "PosPackageBranchAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosPackageBranchAssignment_packageId_branchId_key"
  ON "PosPackageBranchAssignment"("packageId", "branchId");
CREATE INDEX "PosPackageBranchAssignment_branchId_idx"
  ON "PosPackageBranchAssignment"("branchId");
ALTER TABLE "PosPackageBranchAssignment"
  ADD CONSTRAINT "PosPackageBranchAssignment_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "PosPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosPackageBranchAssignment"
  ADD CONSTRAINT "PosPackageBranchAssignment_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WarehouseRequest" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "WarehouseRequestRevision" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actorCredentialId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseRequestRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WarehouseRequestRevision_requestId_version_key"
  ON "WarehouseRequestRevision"("requestId", "version");
CREATE INDEX "WarehouseRequestRevision_requestId_creadoEn_idx"
  ON "WarehouseRequestRevision"("requestId", "creadoEn");
ALTER TABLE "WarehouseRequestRevision"
  ADD CONSTRAINT "WarehouseRequestRevision_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "WarehouseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseRequestRevision"
  ADD CONSTRAINT "WarehouseRequestRevision_actorCredentialId_fkey"
  FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PosInventoryConcept" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "kind" VARCHAR(40) NOT NULL DEFAULT 'WAREHOUSE_CATEGORY',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosInventoryConcept_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosInventoryConcept_kind_normalizedName_key" ON "PosInventoryConcept"("kind", "normalizedName");
CREATE INDEX "PosInventoryConcept_kind_active_normalizedName_idx" ON "PosInventoryConcept"("kind", "active", "normalizedName");
