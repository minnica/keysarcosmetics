-- Fase 6 Scheduler: administración completa y configuración persistente.
-- Migración exclusivamente aditiva. No importa mocks, no crea datos operativos
-- y no modifica la autoridad financiera de POS o Nómina.

CREATE TYPE "SchedulerCommissionTargetType" AS ENUM ('DEFAULT', 'PROFESSIONAL', 'CATALOG_ITEM');
CREATE TYPE "SchedulerCommissionMode" AS ENUM ('APPOINTMENT', 'ATTENDED_APPOINTMENT', 'SALES_PERCENTAGE', 'BRANCH_SALES_TIER');
CREATE TYPE "SchedulerCommissionPeriod" AS ENUM ('DAY', 'WEEK', 'FORTNIGHT', 'MONTH');
CREATE TYPE "SchedulerGiftCardType" AS ENUM ('SERVICE', 'AMOUNT');
CREATE TYPE "SchedulerGiftCardStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "SchedulerSettingScope" AS ENUM ('COMMERCE', 'BRANCH', 'USER');

CREATE TABLE "SchedulerPackageProfile" (
  "id" TEXT NOT NULL,
  "posPackageId" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "acceptsOnline" BOOLEAN NOT NULL DEFAULT false,
  "simultaneous" BOOLEAN NOT NULL DEFAULT false,
  "sessions" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerPackageProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerPackageProfile_values_check" CHECK (
    "sessions" > 0 AND "version" > 0
    AND ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
    AND (("active" AND "deactivatedAt" IS NULL) OR (NOT "active" AND "deactivatedAt" IS NOT NULL))
  )
);

CREATE TABLE "SchedulerPackageBranchAssignment" (
  "id" TEXT NOT NULL,
  "packageProfileId" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerPackageBranchAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerPackageServiceLine" (
  "id" TEXT NOT NULL,
  "packageProfileId" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "priceOverride" DECIMAL(14,2),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerPackageServiceLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerPackageServiceLine_values_check" CHECK (
    "quantity" > 0 AND "sortOrder" >= 0
    AND ("priceOverride" IS NULL OR "priceOverride" >= 0)
  )
);

CREATE TABLE "SchedulerAddonProfile" (
  "id" TEXT NOT NULL,
  "catalogItemId" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerAddonProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerAddonProfile_values_check" CHECK (
    "durationMinutes" >= 0 AND "version" > 0
    AND ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
    AND (("active" AND "deactivatedAt" IS NULL) OR (NOT "active" AND "deactivatedAt" IS NOT NULL))
  )
);

CREATE TABLE "SchedulerServiceAddonAssignment" (
  "id" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "addonProfileId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerServiceAddonAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerServiceAddonAssignment_sort_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "SchedulerClassSchedule" (
  "id" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "professionalProfileId" TEXT NOT NULL,
  "weekday" "SchedulerWeekday" NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "capacity" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerClassSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerClassSchedule_values_check" CHECK (
    "startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute"
    AND "capacity" > 0
    AND ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
    AND (("active" AND "deactivatedAt" IS NULL) OR (NOT "active" AND "deactivatedAt" IS NOT NULL))
  )
);

CREATE TABLE "SchedulerCommissionPolicy" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "identityKey" VARCHAR(240) NOT NULL,
  "targetType" "SchedulerCommissionTargetType" NOT NULL,
  "professionalProfileId" TEXT,
  "catalogItemId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerCommissionPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCommissionPolicy_target_check" CHECK (
    ("targetType" = 'DEFAULT' AND "professionalProfileId" IS NULL AND "catalogItemId" IS NULL)
    OR ("targetType" = 'PROFESSIONAL' AND "professionalProfileId" IS NOT NULL AND "catalogItemId" IS NULL)
    OR ("targetType" = 'CATALOG_ITEM' AND "professionalProfileId" IS NULL AND "catalogItemId" IS NOT NULL)
  ),
  CONSTRAINT "SchedulerCommissionPolicy_version_check" CHECK ("currentVersion" > 0)
);

CREATE TABLE "SchedulerCommissionPolicyVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "policyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "period" "SchedulerCommissionPeriod" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerCommissionPolicyVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCommissionPolicyVersion_values_check" CHECK (
    "version" > 0 AND ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
  )
);

CREATE TABLE "SchedulerCommissionRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "policyVersionId" UUID NOT NULL,
  "mode" "SchedulerCommissionMode" NOT NULL,
  "amount" DECIMAL(14,2),
  "percentage" DECIMAL(7,4),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerCommissionRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCommissionRule_values_check" CHECK (
    "sortOrder" >= 0 AND (
      ("mode" IN ('APPOINTMENT', 'ATTENDED_APPOINTMENT') AND "amount" IS NOT NULL AND "amount" >= 0 AND "percentage" IS NULL)
      OR ("mode" = 'SALES_PERCENTAGE' AND "amount" IS NULL AND "percentage" BETWEEN 0 AND 100)
      OR ("mode" = 'BRANCH_SALES_TIER' AND "amount" IS NULL AND "percentage" IS NULL)
    )
  )
);

CREATE TABLE "SchedulerCommissionTier" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "commissionRuleId" UUID NOT NULL,
  "fromAmount" DECIMAL(14,2) NOT NULL,
  "toAmount" DECIMAL(14,2),
  "percentage" DECIMAL(7,4) NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerCommissionTier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCommissionTier_values_check" CHECK (
    "fromAmount" >= 0 AND ("toAmount" IS NULL OR "toAmount" > "fromAmount")
    AND "percentage" BETWEEN 0 AND 100 AND "sortOrder" >= 0
  )
);

CREATE TABLE "SchedulerGiftCardTemplate" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "type" "SchedulerGiftCardType" NOT NULL,
  "amount" DECIMAL(14,2),
  "salePrice" DECIMAL(14,2) NOT NULL,
  "validityDays" INTEGER NOT NULL,
  "description" TEXT,
  "designKey" VARCHAR(120) NOT NULL,
  "status" "SchedulerGiftCardStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerGiftCardTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerGiftCardTemplate_values_check" CHECK (
    "salePrice" >= 0 AND "validityDays" > 0 AND "version" > 0
    AND (("type" = 'SERVICE' AND "amount" IS NULL) OR ("type" = 'AMOUNT' AND "amount" > 0))
  )
);

CREATE TABLE "SchedulerGiftCardService" (
  "id" TEXT NOT NULL,
  "giftCardId" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerGiftCardService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerStatusColor" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "status" "SchedulerAppointmentStatus" NOT NULL,
  "color" VARCHAR(7) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerStatusColor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerStatusColor_values_check" CHECK (
    "version" > 0 AND "color" ~ '^#[0-9A-Fa-f]{6}$'
  )
);

CREATE TABLE "SchedulerSetting" (
  "id" TEXT NOT NULL,
  "scope" "SchedulerSettingScope" NOT NULL,
  "scopeReferenceId" VARCHAR(191) NOT NULL,
  "commerceId" TEXT,
  "branchProfileId" TEXT,
  "userId" TEXT,
  "section" VARCHAR(80) NOT NULL,
  "document" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerSetting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerSetting_scope_check" CHECK (
    ("scope" = 'COMMERCE' AND "commerceId" = "scopeReferenceId" AND "branchProfileId" IS NULL AND "userId" IS NULL)
    OR ("scope" = 'BRANCH' AND "branchProfileId" = "scopeReferenceId" AND "commerceId" IS NULL AND "userId" IS NULL)
    OR ("scope" = 'USER' AND "scopeReferenceId" = "commerceId" || ':' || "userId" AND "commerceId" IS NOT NULL AND "userId" IS NOT NULL AND "branchProfileId" IS NULL)
  ),
  CONSTRAINT "SchedulerSetting_values_check" CHECK (
    "version" > 0 AND jsonb_typeof("document") = 'object'
    AND "section" IN ('company', 'website', 'agenda', 'payments', 'reminders', 'records', 'emails', 'integrations', 'notifications', 'clients', 'surveys')
  )
);

CREATE TABLE "SchedulerSettingVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "settingId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "document" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerSettingVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerSettingVersion_values_check" CHECK (
    "version" > 0 AND jsonb_typeof("document") = 'object'
  )
);

CREATE UNIQUE INDEX "SchedulerPackageProfile_posPackageId_key" ON "SchedulerPackageProfile"("posPackageId");
CREATE INDEX "SchedulerPackageProfile_commerceId_active_idx" ON "SchedulerPackageProfile"("commerceId", "active");
CREATE UNIQUE INDEX "SchedulerPackageBranchAssignment_packageProfileId_branchProfileId_key" ON "SchedulerPackageBranchAssignment"("packageProfileId", "branchProfileId");
CREATE INDEX "SchedulerPackageBranchAssignment_branchProfileId_idx" ON "SchedulerPackageBranchAssignment"("branchProfileId");
CREATE UNIQUE INDEX "SchedulerPackageServiceLine_packageProfileId_serviceProfileId_key" ON "SchedulerPackageServiceLine"("packageProfileId", "serviceProfileId");
CREATE INDEX "SchedulerPackageServiceLine_serviceProfileId_idx" ON "SchedulerPackageServiceLine"("serviceProfileId");
CREATE UNIQUE INDEX "SchedulerAddonProfile_catalogItemId_key" ON "SchedulerAddonProfile"("catalogItemId");
CREATE INDEX "SchedulerAddonProfile_commerceId_active_idx" ON "SchedulerAddonProfile"("commerceId", "active");
CREATE UNIQUE INDEX "SchedulerServiceAddonAssignment_serviceProfileId_addonProfileId_key" ON "SchedulerServiceAddonAssignment"("serviceProfileId", "addonProfileId");
CREATE INDEX "SchedulerServiceAddonAssignment_addonProfileId_active_idx" ON "SchedulerServiceAddonAssignment"("addonProfileId", "active");
CREATE INDEX "SchedulerClassSchedule_serviceProfileId_branchProfileId_weekday_active_idx" ON "SchedulerClassSchedule"("serviceProfileId", "branchProfileId", "weekday", "active");
CREATE INDEX "SchedulerClassSchedule_professionalProfileId_weekday_active_idx" ON "SchedulerClassSchedule"("professionalProfileId", "weekday", "active");
CREATE UNIQUE INDEX "SchedulerCommissionPolicy_identityKey_key" ON "SchedulerCommissionPolicy"("identityKey");
CREATE INDEX "SchedulerCommissionPolicy_commerceId_active_idx" ON "SchedulerCommissionPolicy"("commerceId", "active");
CREATE INDEX "SchedulerCommissionPolicy_professionalProfileId_idx" ON "SchedulerCommissionPolicy"("professionalProfileId");
CREATE INDEX "SchedulerCommissionPolicy_catalogItemId_idx" ON "SchedulerCommissionPolicy"("catalogItemId");
CREATE UNIQUE INDEX "SchedulerCommissionPolicyVersion_policyId_version_key" ON "SchedulerCommissionPolicyVersion"("policyId", "version");
CREATE INDEX "SchedulerCommissionPolicyVersion_policyId_effectiveFrom_effectiveTo_idx" ON "SchedulerCommissionPolicyVersion"("policyId", "effectiveFrom", "effectiveTo");
CREATE UNIQUE INDEX "SchedulerCommissionRule_policyVersionId_mode_key" ON "SchedulerCommissionRule"("policyVersionId", "mode");
CREATE UNIQUE INDEX "SchedulerCommissionTier_commissionRuleId_sortOrder_key" ON "SchedulerCommissionTier"("commissionRuleId", "sortOrder");
CREATE UNIQUE INDEX "SchedulerGiftCardTemplate_commerceId_normalizedName_key" ON "SchedulerGiftCardTemplate"("commerceId", "normalizedName");
CREATE INDEX "SchedulerGiftCardTemplate_commerceId_status_idx" ON "SchedulerGiftCardTemplate"("commerceId", "status");
CREATE UNIQUE INDEX "SchedulerGiftCardService_giftCardId_serviceProfileId_key" ON "SchedulerGiftCardService"("giftCardId", "serviceProfileId");
CREATE INDEX "SchedulerGiftCardService_serviceProfileId_idx" ON "SchedulerGiftCardService"("serviceProfileId");
CREATE UNIQUE INDEX "SchedulerStatusColor_commerceId_status_key" ON "SchedulerStatusColor"("commerceId", "status");
CREATE UNIQUE INDEX "SchedulerSetting_scope_scopeReferenceId_section_key" ON "SchedulerSetting"("scope", "scopeReferenceId", "section");
CREATE INDEX "SchedulerSetting_commerceId_section_idx" ON "SchedulerSetting"("commerceId", "section");
CREATE INDEX "SchedulerSetting_branchProfileId_section_idx" ON "SchedulerSetting"("branchProfileId", "section");
CREATE INDEX "SchedulerSetting_userId_section_idx" ON "SchedulerSetting"("userId", "section");
CREATE UNIQUE INDEX "SchedulerSettingVersion_settingId_version_key" ON "SchedulerSettingVersion"("settingId", "version");
CREATE INDEX "SchedulerSettingVersion_settingId_creadoEn_idx" ON "SchedulerSettingVersion"("settingId", "creadoEn");

ALTER TABLE "SchedulerPackageProfile" ADD CONSTRAINT "SchedulerPackageProfile_posPackageId_fkey" FOREIGN KEY ("posPackageId") REFERENCES "PosPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerPackageProfile" ADD CONSTRAINT "SchedulerPackageProfile_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerPackageBranchAssignment" ADD CONSTRAINT "SchedulerPackageBranchAssignment_packageProfileId_fkey" FOREIGN KEY ("packageProfileId") REFERENCES "SchedulerPackageProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerPackageBranchAssignment" ADD CONSTRAINT "SchedulerPackageBranchAssignment_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerPackageServiceLine" ADD CONSTRAINT "SchedulerPackageServiceLine_packageProfileId_fkey" FOREIGN KEY ("packageProfileId") REFERENCES "SchedulerPackageProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerPackageServiceLine" ADD CONSTRAINT "SchedulerPackageServiceLine_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAddonProfile" ADD CONSTRAINT "SchedulerAddonProfile_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerAddonProfile" ADD CONSTRAINT "SchedulerAddonProfile_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerServiceAddonAssignment" ADD CONSTRAINT "SchedulerServiceAddonAssignment_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerServiceAddonAssignment" ADD CONSTRAINT "SchedulerServiceAddonAssignment_addonProfileId_fkey" FOREIGN KEY ("addonProfileId") REFERENCES "SchedulerAddonProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerClassSchedule" ADD CONSTRAINT "SchedulerClassSchedule_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerClassSchedule" ADD CONSTRAINT "SchedulerClassSchedule_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerClassSchedule" ADD CONSTRAINT "SchedulerClassSchedule_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCommissionPolicy" ADD CONSTRAINT "SchedulerCommissionPolicy_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCommissionPolicy" ADD CONSTRAINT "SchedulerCommissionPolicy_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "SchedulerProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCommissionPolicy" ADD CONSTRAINT "SchedulerCommissionPolicy_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCommissionPolicyVersion" ADD CONSTRAINT "SchedulerCommissionPolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SchedulerCommissionPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCommissionPolicyVersion" ADD CONSTRAINT "SchedulerCommissionPolicyVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCommissionRule" ADD CONSTRAINT "SchedulerCommissionRule_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "SchedulerCommissionPolicyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerCommissionTier" ADD CONSTRAINT "SchedulerCommissionTier_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "SchedulerCommissionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerGiftCardTemplate" ADD CONSTRAINT "SchedulerGiftCardTemplate_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerGiftCardService" ADD CONSTRAINT "SchedulerGiftCardService_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "SchedulerGiftCardTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerGiftCardService" ADD CONSTRAINT "SchedulerGiftCardService_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerStatusColor" ADD CONSTRAINT "SchedulerStatusColor_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSetting" ADD CONSTRAINT "SchedulerSetting_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSetting" ADD CONSTRAINT "SchedulerSetting_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSetting" ADD CONSTRAINT "SchedulerSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulerSetting" ADD CONSTRAINT "SchedulerSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSettingVersion" ADD CONSTRAINT "SchedulerSettingVersion_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "SchedulerSetting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSettingVersion" ADD CONSTRAINT "SchedulerSettingVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
