-- Fase 2 POS: catálogo, clientes, configuración y activos.
-- Aditiva: no toca ventas legacy ni inserta datos operativos o demostrativos.

CREATE TYPE "CatalogItemKind" AS ENUM ('PRODUCT', 'SERVICE', 'SUPPLY', 'MACHINE');
CREATE TYPE "PosAssetStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');
CREATE TYPE "PosPriceListStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "PosPackageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'INACTIVE');
CREATE TYPE "PosVoucherKind" AS ENUM ('NEXT_PURCHASE_DISCOUNT', 'COMPANION_FACIAL', 'MEMBERSHIP_DISCOUNT');
CREATE TYPE "PosCompetitionType" AS ENUM ('AMOUNT', 'PRODUCT', 'PACKAGE', 'PERIOD');

CREATE TABLE "CatalogTaxonomy" (
  "id" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "normalizedName" VARCHAR(180) NOT NULL,
  "parentId" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "deletedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogTaxonomy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosSupplier" (
  "id" TEXT NOT NULL, "folio" VARCHAR(64) NOT NULL, "businessName" VARCHAR(240) NOT NULL,
  "normalizedName" VARCHAR(260) NOT NULL, "contactName" TEXT, "rfc" VARCHAR(20), "taxRegime" TEXT,
  "businessLine" TEXT, "phone" TEXT, "email" TEXT, "address" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3), "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "PosSupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogItem" (
  "id" TEXT NOT NULL, "sku" VARCHAR(96) NOT NULL, "name" VARCHAR(240) NOT NULL,
  "normalizedName" VARCHAR(260) NOT NULL, "kind" "CatalogItemKind" NOT NULL, "familyId" TEXT,
  "categoryId" TEXT, "description" TEXT, "published" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true, "deletedAt" TIMESTAMP(3),
  "listPrice" DECIMAL(14,2) NOT NULL DEFAULT 0, "minimumPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(14,2) NOT NULL DEFAULT 0, "taxRate" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "supplierId" TEXT, "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogItem_prices_valid_check" CHECK ("unitCost" >= 0 AND "minimumPrice" >= 0 AND "listPrice" >= "minimumPrice" AND "taxRate" >= 0 AND "taxRate" <= 100)
);

CREATE TABLE "CatalogItemBenefit" (
  "id" TEXT NOT NULL, "itemId" TEXT NOT NULL, "text" VARCHAR(500) NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CatalogItemBenefit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogItemBranchVisibility" (
  "id" TEXT NOT NULL, "itemId" TEXT NOT NULL, "branchId" TEXT NOT NULL, "visible" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogItemBranchVisibility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogItemPrice" (
  "id" TEXT NOT NULL, "itemId" TEXT NOT NULL, "listPrice" DECIMAL(14,2) NOT NULL,
  "minimumPrice" DECIMAL(14,2) NOT NULL, "unitCost" DECIMAL(14,2) NOT NULL, "taxRate" DECIMAL(8,2) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdByCredentialId" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CatalogItemPrice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogItemPrice_values_valid_check" CHECK ("unitCost" >= 0 AND "minimumPrice" >= 0 AND "listPrice" >= "minimumPrice" AND "taxRate" >= 0 AND "taxRate" <= 100)
);

CREATE TABLE "CatalogAsset" (
  "id" TEXT NOT NULL, "itemId" TEXT NOT NULL, "storagePath" TEXT NOT NULL, "publicUrl" TEXT NOT NULL,
  "fileName" VARCHAR(255) NOT NULL, "mimeType" VARCHAR(100) NOT NULL, "sizeBytes" INTEGER NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false, "status" "PosAssetStatus" NOT NULL DEFAULT 'PENDING',
  "createdByCredentialId" TEXT, "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "CatalogAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogAsset_size_valid_check" CHECK ("sizeBytes" > 0)
);

CREATE TABLE "CustomerSource" (
  "id" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3), "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "CustomerSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL, "displayName" VARCHAR(240) NOT NULL, "normalizedName" VARCHAR(260) NOT NULL,
  "phone" VARCHAR(32), "email" VARCHAR(320), "sourceId" TEXT, "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "deletedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPortfolioAssignment" (
  "id" TEXT NOT NULL, "customerId" TEXT NOT NULL, "branchId" TEXT, "employeeId" TEXT,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "effectiveTo" TIMESTAMP(3),
  "createdByCredentialId" TEXT, "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerPortfolioAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerPortfolioAssignment_date_valid_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);

CREATE TABLE "PosPaymentMethodPolicy" (
  "id" TEXT NOT NULL, "paymentMethodId" TEXT NOT NULL, "requiresReference" BOOLEAN NOT NULL DEFAULT false,
  "referenceLabel" VARCHAR(80), "minAmount" DECIMAL(14,2), "maxAmount" DECIMAL(14,2),
  "activeForPos" BOOLEAN NOT NULL DEFAULT true, "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "PosPaymentMethodPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosPaymentMethodPolicy_amount_valid_check" CHECK ("minAmount" IS NULL OR "minAmount" >= 0) 
);

CREATE TABLE "PosTicketConfiguration" (
  "id" TEXT NOT NULL, "branchId" TEXT, "logoAssetId" TEXT, "companyName" VARCHAR(160) NOT NULL DEFAULT 'KEYSAR COSMETICS',
  "address" TEXT, "footerMessage" TEXT, "policies" TEXT, "showClientName" BOOLEAN NOT NULL DEFAULT true,
  "showClientPhone" BOOLEAN NOT NULL DEFAULT true, "showSellerName" BOOLEAN NOT NULL DEFAULT true,
  "showVatBreakdown" BOOLEAN NOT NULL DEFAULT true, "showSpareCoverageMessage" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosTicketConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosCustomerRequiredField" (
  "id" TEXT NOT NULL, "key" VARCHAR(80) NOT NULL, "label" VARCHAR(120) NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false, "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosCustomerRequiredField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosCourtesyPolicy" (
  "id" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "description" TEXT, "requiresCustomer" BOOLEAN NOT NULL DEFAULT true,
  "requiresAuthorization" BOOLEAN NOT NULL DEFAULT true, "active" BOOLEAN NOT NULL DEFAULT true, "deletedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosCourtesyPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosVoucherTemplate" (
  "id" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "kind" "PosVoucherKind" NOT NULL, "value" DECIMAL(14,2) NOT NULL,
  "message" VARCHAR(1000) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "visibleToSellers" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3), "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "PosVoucherTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosVoucherTemplate_value_valid_check" CHECK ("value" >= 0)
);

CREATE TABLE "PosPriceList" (
  "id" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "status" "PosPriceListStatus" NOT NULL DEFAULT 'DRAFT', "supplierId" TEXT, "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3), "deletedAt" TIMESTAMP(3), "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "PosPriceList_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosPriceList_date_valid_check" CHECK ("effectiveTo" IS NULL OR "effectiveFrom" IS NULL OR "effectiveTo" > "effectiveFrom")
);

CREATE TABLE "PosPriceListLine" (
  "id" TEXT NOT NULL, "priceListId" TEXT NOT NULL, "itemId" TEXT NOT NULL, "price" DECIMAL(14,2) NOT NULL,
  "cost" DECIMAL(14,2), "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosPriceListLine_pkey" PRIMARY KEY ("id"), CONSTRAINT "PosPriceListLine_values_valid_check" CHECK ("price" >= 0 AND ("cost" IS NULL OR "cost" >= 0))
);

CREATE TABLE "PriceListBranchAssignment" (
  "id" TEXT NOT NULL, "priceListId" TEXT NOT NULL, "branchId" TEXT NOT NULL,
  CONSTRAINT "PriceListBranchAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceListCustomerAssignment" (
  "id" TEXT NOT NULL, "priceListId" TEXT NOT NULL, "customerId" TEXT NOT NULL,
  CONSTRAINT "PriceListCustomerAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosPackage" (
  "id" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "sku" VARCHAR(96) NOT NULL, "description" TEXT,
  "price" DECIMAL(14,2) NOT NULL, "status" "PosPackageStatus" NOT NULL DEFAULT 'DRAFT', "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3), "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "PosPackage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosPackage_values_valid_check" CHECK ("price" >= 0 AND ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt"))
);

CREATE TABLE "PosPackageLine" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "itemId" TEXT NOT NULL, "quantity" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "PosPackageLine_pkey" PRIMARY KEY ("id"), CONSTRAINT "PosPackageLine_quantity_valid_check" CHECK ("quantity" > 0)
);

CREATE TABLE "PosSalesCompetition" (
  "id" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "type" "PosCompetitionType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "dateFrom" DATE NOT NULL, "dateTo" DATE NOT NULL, "branchId" TEXT,
  "targetAmount" DECIMAL(14,2), "itemId" TEXT, "packageItemIds" JSONB, "deletedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosSalesCompetition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosSalesCompetition_dates_valid_check" CHECK ("dateTo" >= "dateFrom")
);

CREATE UNIQUE INDEX "CatalogTaxonomy_parentId_normalizedName_key" ON "CatalogTaxonomy"("parentId", "normalizedName");
CREATE INDEX "CatalogTaxonomy_parentId_active_idx" ON "CatalogTaxonomy"("parentId", "active");
CREATE UNIQUE INDEX "PosSupplier_folio_key" ON "PosSupplier"("folio");
CREATE UNIQUE INDEX "PosSupplier_normalizedName_key" ON "PosSupplier"("normalizedName");
CREATE INDEX "PosSupplier_active_normalizedName_idx" ON "PosSupplier"("active", "normalizedName");
CREATE UNIQUE INDEX "CatalogItem_sku_key" ON "CatalogItem"("sku");
CREATE INDEX "CatalogItem_active_published_kind_idx" ON "CatalogItem"("active", "published", "kind");
CREATE INDEX "CatalogItem_familyId_categoryId_idx" ON "CatalogItem"("familyId", "categoryId");
CREATE INDEX "CatalogItem_supplierId_idx" ON "CatalogItem"("supplierId");
CREATE UNIQUE INDEX "CatalogItemBenefit_itemId_sortOrder_key" ON "CatalogItemBenefit"("itemId", "sortOrder");
CREATE UNIQUE INDEX "CatalogItemBranchVisibility_itemId_branchId_key" ON "CatalogItemBranchVisibility"("itemId", "branchId");
CREATE INDEX "CatalogItemBranchVisibility_branchId_visible_idx" ON "CatalogItemBranchVisibility"("branchId", "visible");
CREATE INDEX "CatalogItemPrice_itemId_effectiveAt_idx" ON "CatalogItemPrice"("itemId", "effectiveAt");
CREATE UNIQUE INDEX "CatalogAsset_storagePath_key" ON "CatalogAsset"("storagePath");
CREATE INDEX "CatalogAsset_itemId_status_idx" ON "CatalogAsset"("itemId", "status");
CREATE UNIQUE INDEX "CustomerSource_name_key" ON "CustomerSource"("name");
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX "Customer_normalizedName_active_idx" ON "Customer"("normalizedName", "active");
CREATE INDEX "Customer_sourceId_idx" ON "Customer"("sourceId");
CREATE INDEX "CustomerPortfolioAssignment_customerId_effectiveFrom_effectiveTo_idx" ON "CustomerPortfolioAssignment"("customerId", "effectiveFrom", "effectiveTo");
CREATE INDEX "CustomerPortfolioAssignment_branchId_employeeId_idx" ON "CustomerPortfolioAssignment"("branchId", "employeeId");
CREATE UNIQUE INDEX "PosPaymentMethodPolicy_paymentMethodId_key" ON "PosPaymentMethodPolicy"("paymentMethodId");
CREATE UNIQUE INDEX "PosTicketConfiguration_branchId_key" ON "PosTicketConfiguration"("branchId");
CREATE UNIQUE INDEX "PosCustomerRequiredField_key_key" ON "PosCustomerRequiredField"("key");
CREATE UNIQUE INDEX "PosCourtesyPolicy_name_key" ON "PosCourtesyPolicy"("name");
CREATE UNIQUE INDEX "PosVoucherTemplate_name_key" ON "PosVoucherTemplate"("name");
CREATE UNIQUE INDEX "PosPriceList_name_version_key" ON "PosPriceList"("name", "version");
CREATE INDEX "PosPriceList_status_effectiveFrom_effectiveTo_idx" ON "PosPriceList"("status", "effectiveFrom", "effectiveTo");
CREATE UNIQUE INDEX "PosPriceListLine_priceListId_itemId_key" ON "PosPriceListLine"("priceListId", "itemId");
CREATE UNIQUE INDEX "PriceListBranchAssignment_priceListId_branchId_key" ON "PriceListBranchAssignment"("priceListId", "branchId");
CREATE UNIQUE INDEX "PriceListCustomerAssignment_priceListId_customerId_key" ON "PriceListCustomerAssignment"("priceListId", "customerId");
CREATE UNIQUE INDEX "PosPackage_sku_key" ON "PosPackage"("sku");
CREATE INDEX "PosPackage_status_startsAt_endsAt_idx" ON "PosPackage"("status", "startsAt", "endsAt");
CREATE UNIQUE INDEX "PosPackageLine_packageId_itemId_key" ON "PosPackageLine"("packageId", "itemId");
CREATE INDEX "PosSalesCompetition_active_dateFrom_dateTo_idx" ON "PosSalesCompetition"("active", "dateFrom", "dateTo");
CREATE INDEX "PosSalesCompetition_branchId_idx" ON "PosSalesCompetition"("branchId");

ALTER TABLE "CatalogTaxonomy" ADD CONSTRAINT "CatalogTaxonomy_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CatalogTaxonomy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "CatalogTaxonomy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CatalogTaxonomy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "PosSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogItemBenefit" ADD CONSTRAINT "CatalogItemBenefit_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogItemBranchVisibility" ADD CONSTRAINT "CatalogItemBranchVisibility_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogItemBranchVisibility" ADD CONSTRAINT "CatalogItemBranchVisibility_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogItemPrice" ADD CONSTRAINT "CatalogItemPrice_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogAsset" ADD CONSTRAINT "CatalogAsset_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CustomerSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPortfolioAssignment" ADD CONSTRAINT "CustomerPortfolioAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPaymentMethodPolicy" ADD CONSTRAINT "PosPaymentMethodPolicy_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "MetodoPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPriceList" ADD CONSTRAINT "PosPriceList_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "PosSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPriceListLine" ADD CONSTRAINT "PosPriceListLine_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PosPriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosPriceListLine" ADD CONSTRAINT "PosPriceListLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceListBranchAssignment" ADD CONSTRAINT "PriceListBranchAssignment_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PosPriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceListBranchAssignment" ADD CONSTRAINT "PriceListBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceListCustomerAssignment" ADD CONSTRAINT "PriceListCustomerAssignment_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PosPriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceListCustomerAssignment" ADD CONSTRAINT "PriceListCustomerAssignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosPackageLine" ADD CONSTRAINT "PosPackageLine_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PosPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosPackageLine" ADD CONSTRAINT "PosPackageLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosSalesCompetition" ADD CONSTRAINT "PosSalesCompetition_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
