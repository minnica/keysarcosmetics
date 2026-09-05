-- Fase 7 de Scheduler: cambios exclusivamente aditivos.
-- No hace backfill, no importa mocks y no crea datos operativos.

CREATE TYPE "SchedulerMessageChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS');
CREATE TYPE "SchedulerMessageOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELED');
CREATE TYPE "SchedulerContactChannelStatus" AS ENUM ('UNVERIFIED', 'OPTED_IN', 'OPTED_OUT');
CREATE TYPE "SchedulerConsentStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED', 'REVOKED');
CREATE TYPE "SchedulerDocumentKind" AS ENUM ('CONSENT_SUPPORT', 'MEDICAL_SUPPORT', 'OTHER');
CREATE TYPE "SchedulerSurveyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "SchedulerSurveyQuestionType" AS ENUM ('RATING', 'COMMENT');

CREATE TABLE "SchedulerMessageTemplate" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "channel" "SchedulerMessageChannel" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerMessageTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerMessageTemplate_version_check" CHECK ("currentVersion" > 0)
);

CREATE TABLE "SchedulerMessageTemplateVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "subject" VARCHAR(240),
  "body" TEXT NOT NULL,
  "variables" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerMessageTemplateVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerMessageTemplateVersion_values_check" CHECK (
    "version" > 0 AND length(trim("body")) > 0 AND jsonb_typeof("variables") = 'array'
  )
);

CREATE TABLE "SchedulerCustomerContactChannel" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "channel" "SchedulerMessageChannel" NOT NULL,
  "status" "SchedulerContactChannelStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "destinationHash" VARCHAR(64),
  "verifiedAt" TIMESTAMP(3),
  "consentedAt" TIMESTAMP(3),
  "optedOutAt" TIMESTAMP(3),
  "source" VARCHAR(120),
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerCustomerContactChannel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCustomerContactChannel_values_check" CHECK (
    "version" > 0 AND ("destinationHash" IS NULL OR "destinationHash" ~ '^[0-9a-f]{64}$')
  )
);

CREATE TABLE "SchedulerMessageOutbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "appointmentId" UUID,
  "customerId" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "templateVersionId" UUID NOT NULL,
  "channel" "SchedulerMessageChannel" NOT NULL,
  "destinationCiphertext" TEXT NOT NULL,
  "destinationIv" VARCHAR(32) NOT NULL,
  "destinationAuthTag" VARCHAR(32) NOT NULL,
  "encryptionKeyVersion" VARCHAR(40) NOT NULL,
  "variablesSnapshot" JSONB NOT NULL,
  "status" "SchedulerMessageOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lockedAt" TIMESTAMP(3),
  "lockOwner" VARCHAR(120),
  "providerMessageId" VARCHAR(191),
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "cancelReason" VARCHAR(240),
  "lastErrorCode" VARCHAR(120),
  "createdByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerMessageOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerMessageOutbox_retry_check" CHECK (
    "attempts" >= 0 AND "requestHash" ~ '^[0-9a-f]{64}$'
    AND "destinationIv" ~ '^[0-9a-f]{24}$'
    AND "destinationAuthTag" ~ '^[0-9a-f]{32}$'
  ),
  CONSTRAINT "SchedulerMessageOutbox_variables_check" CHECK (jsonb_typeof("variablesSnapshot") = 'object')
);

CREATE TABLE "SchedulerMessageDeliveryEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "outboxId" UUID NOT NULL,
  "providerEventId" VARCHAR(191) NOT NULL,
  "providerStatus" VARCHAR(80) NOT NULL,
  "payloadHash" VARCHAR(64) NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerMessageDeliveryEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerMessageDeliveryEvent_hash_check" CHECK ("payloadHash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "SchedulerConsentTemplate" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerConsentTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerConsentTemplate_version_check" CHECK ("currentVersion" > 0)
);

CREATE TABLE "SchedulerConsentTemplateVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "storageBucket" VARCHAR(120) NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(120) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" VARCHAR(64) NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerConsentTemplateVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerConsentTemplateVersion_values_check" CHECK (
    "version" > 0 AND "sizeBytes" > 0 AND "sha256" ~ '^[0-9a-f]{64}$'
  )
);

CREATE TABLE "SchedulerConsentRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "templateVersionId" UUID NOT NULL,
  "customerId" TEXT NOT NULL,
  "appointmentId" UUID,
  "branchProfileId" TEXT NOT NULL,
  "status" "SchedulerConsentStatus" NOT NULL DEFAULT 'PENDING',
  "signatureEvidenceHash" VARCHAR(64),
  "signedStoragePath" TEXT,
  "signedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerConsentRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerConsentRecord_evidence_check" CHECK (
    ("signatureEvidenceHash" IS NULL OR "signatureEvidenceHash" ~ '^[0-9a-f]{64}$')
    AND (
      ("status" = 'PENDING' AND "signatureEvidenceHash" IS NULL AND "signedStoragePath" IS NULL AND "signedAt" IS NULL AND "declinedAt" IS NULL AND "revokedAt" IS NULL)
      OR ("status" = 'DECLINED' AND "signatureEvidenceHash" IS NULL AND "signedStoragePath" IS NULL AND "signedAt" IS NULL AND "declinedAt" IS NOT NULL AND "revokedAt" IS NULL)
      OR ("status" = 'SIGNED' AND "signatureEvidenceHash" IS NOT NULL AND "signedStoragePath" IS NOT NULL AND "signedAt" IS NOT NULL AND "revokedAt" IS NULL)
      OR ("status" = 'REVOKED' AND "signatureEvidenceHash" IS NOT NULL AND "signedStoragePath" IS NOT NULL AND "signedAt" IS NOT NULL AND "revokedAt" IS NOT NULL)
    )
  )
);

CREATE TABLE "SchedulerCustomerDocument" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customerId" TEXT NOT NULL,
  "branchProfileId" TEXT NOT NULL,
  "kind" "SchedulerDocumentKind" NOT NULL,
  "storagePath" TEXT NOT NULL,
  "storageBucket" VARCHAR(120) NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(120) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" VARCHAR(64) NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerCustomerDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerCustomerDocument_values_check" CHECK (
    "sizeBytes" > 0 AND "sha256" ~ '^[0-9a-f]{64}$'
  )
);

CREATE TABLE "SchedulerMedicalRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "commerceId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" VARCHAR(32) NOT NULL,
  "authTag" VARCHAR(32) NOT NULL,
  "encryptionKeyVersion" VARCHAR(40) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerMedicalRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerMedicalRecord_version_check" CHECK (
    "version" > 0 AND "iv" ~ '^[0-9a-f]{24}$' AND "authTag" ~ '^[0-9a-f]{32}$'
  )
);

CREATE TABLE "SchedulerSurvey" (
  "id" TEXT NOT NULL,
  "commerceId" TEXT NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "status" "SchedulerSurveyStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerSurvey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerSurvey_version_check" CHECK ("currentVersion" > 0)
);

CREATE TABLE "SchedulerSurveyVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "surveyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "introduction" VARCHAR(2000),
  "createdByUserId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerSurveyVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerSurveyQuestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "surveyVersionId" UUID NOT NULL,
  "type" "SchedulerSurveyQuestionType" NOT NULL,
  "prompt" VARCHAR(500) NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "SchedulerSurveyQuestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerSurveyQuestion_order_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "SchedulerSurveyService" (
  "id" TEXT NOT NULL,
  "surveyId" TEXT NOT NULL,
  "serviceProfileId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerSurveyService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerSurveyToken" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenHash" VARCHAR(64) NOT NULL,
  "surveyVersionId" UUID NOT NULL,
  "customerId" TEXT NOT NULL,
  "appointmentId" UUID,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerSurveyToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchedulerSurveyToken_hash_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "SchedulerSurveyResponse" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenId" UUID NOT NULL,
  "customerId" TEXT NOT NULL,
  "appointmentId" UUID,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerSurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerSurveyAnswer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "responseId" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "promptSnapshot" VARCHAR(500) NOT NULL,
  "typeSnapshot" "SchedulerSurveyQuestionType" NOT NULL,
  "value" JSONB NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchedulerSurveyAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchedulerMessageTemplate_commerceId_normalizedName_channel_key" ON "SchedulerMessageTemplate"("commerceId", "normalizedName", "channel");
CREATE INDEX "SchedulerMessageTemplate_commerceId_channel_active_idx" ON "SchedulerMessageTemplate"("commerceId", "channel", "active");
CREATE UNIQUE INDEX "SchedulerMessageTemplateVersion_templateId_version_key" ON "SchedulerMessageTemplateVersion"("templateId", "version");
CREATE INDEX "SchedulerMessageTemplateVersion_templateId_creadoEn_idx" ON "SchedulerMessageTemplateVersion"("templateId", "creadoEn");
CREATE UNIQUE INDEX "SchedulerCustomerContactChannel_customerId_channel_key" ON "SchedulerCustomerContactChannel"("customerId", "channel");
CREATE INDEX "SchedulerCustomerContactChannel_channel_status_idx" ON "SchedulerCustomerContactChannel"("channel", "status");
CREATE UNIQUE INDEX "SchedulerMessageOutbox_idempotencyKey_key" ON "SchedulerMessageOutbox"("idempotencyKey");
CREATE UNIQUE INDEX "SchedulerMessageOutbox_providerMessageId_key" ON "SchedulerMessageOutbox"("providerMessageId");
CREATE INDEX "SchedulerMessageOutbox_status_nextAttemptAt_idx" ON "SchedulerMessageOutbox"("status", "nextAttemptAt");
CREATE INDEX "SchedulerMessageOutbox_appointmentId_status_idx" ON "SchedulerMessageOutbox"("appointmentId", "status");
CREATE INDEX "SchedulerMessageOutbox_customerId_creadoEn_idx" ON "SchedulerMessageOutbox"("customerId", "creadoEn");
CREATE INDEX "SchedulerMessageOutbox_branchProfileId_creadoEn_idx" ON "SchedulerMessageOutbox"("branchProfileId", "creadoEn");
CREATE UNIQUE INDEX "SchedulerMessageDeliveryEvent_providerEventId_key" ON "SchedulerMessageDeliveryEvent"("providerEventId");
CREATE INDEX "SchedulerMessageDeliveryEvent_outboxId_occurredAt_idx" ON "SchedulerMessageDeliveryEvent"("outboxId", "occurredAt");
CREATE UNIQUE INDEX "SchedulerConsentTemplate_commerceId_normalizedName_key" ON "SchedulerConsentTemplate"("commerceId", "normalizedName");
CREATE INDEX "SchedulerConsentTemplate_commerceId_active_idx" ON "SchedulerConsentTemplate"("commerceId", "active");
CREATE UNIQUE INDEX "SchedulerConsentTemplateVersion_storagePath_key" ON "SchedulerConsentTemplateVersion"("storagePath");
CREATE UNIQUE INDEX "SchedulerConsentTemplateVersion_templateId_version_key" ON "SchedulerConsentTemplateVersion"("templateId", "version");
CREATE INDEX "SchedulerConsentTemplateVersion_templateId_creadoEn_idx" ON "SchedulerConsentTemplateVersion"("templateId", "creadoEn");
CREATE UNIQUE INDEX "SchedulerConsentRecord_signedStoragePath_key" ON "SchedulerConsentRecord"("signedStoragePath");
CREATE INDEX "SchedulerConsentRecord_customerId_creadoEn_idx" ON "SchedulerConsentRecord"("customerId", "creadoEn");
CREATE INDEX "SchedulerConsentRecord_appointmentId_status_idx" ON "SchedulerConsentRecord"("appointmentId", "status");
CREATE INDEX "SchedulerConsentRecord_branchProfileId_creadoEn_idx" ON "SchedulerConsentRecord"("branchProfileId", "creadoEn");
CREATE UNIQUE INDEX "SchedulerCustomerDocument_storagePath_key" ON "SchedulerCustomerDocument"("storagePath");
CREATE INDEX "SchedulerCustomerDocument_customerId_creadoEn_idx" ON "SchedulerCustomerDocument"("customerId", "creadoEn");
CREATE INDEX "SchedulerCustomerDocument_branchProfileId_creadoEn_idx" ON "SchedulerCustomerDocument"("branchProfileId", "creadoEn");
CREATE UNIQUE INDEX "SchedulerMedicalRecord_commerceId_customerId_key" ON "SchedulerMedicalRecord"("commerceId", "customerId");
CREATE INDEX "SchedulerMedicalRecord_customerId_idx" ON "SchedulerMedicalRecord"("customerId");
CREATE UNIQUE INDEX "SchedulerSurvey_commerceId_normalizedName_key" ON "SchedulerSurvey"("commerceId", "normalizedName");
CREATE INDEX "SchedulerSurvey_commerceId_status_idx" ON "SchedulerSurvey"("commerceId", "status");
CREATE UNIQUE INDEX "SchedulerSurveyVersion_surveyId_version_key" ON "SchedulerSurveyVersion"("surveyId", "version");
CREATE INDEX "SchedulerSurveyVersion_surveyId_creadoEn_idx" ON "SchedulerSurveyVersion"("surveyId", "creadoEn");
CREATE UNIQUE INDEX "SchedulerSurveyQuestion_surveyVersionId_sortOrder_key" ON "SchedulerSurveyQuestion"("surveyVersionId", "sortOrder");
CREATE UNIQUE INDEX "SchedulerSurveyService_surveyId_serviceProfileId_key" ON "SchedulerSurveyService"("surveyId", "serviceProfileId");
CREATE INDEX "SchedulerSurveyService_serviceProfileId_idx" ON "SchedulerSurveyService"("serviceProfileId");
CREATE UNIQUE INDEX "SchedulerSurveyToken_tokenHash_key" ON "SchedulerSurveyToken"("tokenHash");
CREATE INDEX "SchedulerSurveyToken_customerId_expiresAt_idx" ON "SchedulerSurveyToken"("customerId", "expiresAt");
CREATE INDEX "SchedulerSurveyToken_appointmentId_expiresAt_idx" ON "SchedulerSurveyToken"("appointmentId", "expiresAt");
CREATE UNIQUE INDEX "SchedulerSurveyResponse_tokenId_key" ON "SchedulerSurveyResponse"("tokenId");
CREATE INDEX "SchedulerSurveyResponse_customerId_submittedAt_idx" ON "SchedulerSurveyResponse"("customerId", "submittedAt");
CREATE INDEX "SchedulerSurveyResponse_appointmentId_submittedAt_idx" ON "SchedulerSurveyResponse"("appointmentId", "submittedAt");
CREATE UNIQUE INDEX "SchedulerSurveyAnswer_responseId_questionId_key" ON "SchedulerSurveyAnswer"("responseId", "questionId");

ALTER TABLE "SchedulerMessageTemplate" ADD CONSTRAINT "SchedulerMessageTemplate_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMessageTemplateVersion" ADD CONSTRAINT "SchedulerMessageTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SchedulerMessageTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMessageTemplateVersion" ADD CONSTRAINT "SchedulerMessageTemplateVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerContactChannel" ADD CONSTRAINT "SchedulerCustomerContactChannel_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMessageOutbox" ADD CONSTRAINT "SchedulerMessageOutbox_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "SchedulerAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMessageOutbox" ADD CONSTRAINT "SchedulerMessageOutbox_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMessageOutbox" ADD CONSTRAINT "SchedulerMessageOutbox_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMessageOutbox" ADD CONSTRAINT "SchedulerMessageOutbox_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "SchedulerMessageTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMessageOutbox" ADD CONSTRAINT "SchedulerMessageOutbox_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMessageDeliveryEvent" ADD CONSTRAINT "SchedulerMessageDeliveryEvent_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "SchedulerMessageOutbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerConsentTemplate" ADD CONSTRAINT "SchedulerConsentTemplate_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerConsentTemplateVersion" ADD CONSTRAINT "SchedulerConsentTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SchedulerConsentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerConsentTemplateVersion" ADD CONSTRAINT "SchedulerConsentTemplateVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerConsentRecord" ADD CONSTRAINT "SchedulerConsentRecord_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "SchedulerConsentTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerConsentRecord" ADD CONSTRAINT "SchedulerConsentRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerConsentRecord" ADD CONSTRAINT "SchedulerConsentRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "SchedulerAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerConsentRecord" ADD CONSTRAINT "SchedulerConsentRecord_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerDocument" ADD CONSTRAINT "SchedulerCustomerDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerDocument" ADD CONSTRAINT "SchedulerCustomerDocument_branchProfileId_fkey" FOREIGN KEY ("branchProfileId") REFERENCES "SchedulerBranchProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerCustomerDocument" ADD CONSTRAINT "SchedulerCustomerDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMedicalRecord" ADD CONSTRAINT "SchedulerMedicalRecord_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMedicalRecord" ADD CONSTRAINT "SchedulerMedicalRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerMedicalRecord" ADD CONSTRAINT "SchedulerMedicalRecord_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurvey" ADD CONSTRAINT "SchedulerSurvey_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "SchedulerCommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyVersion" ADD CONSTRAINT "SchedulerSurveyVersion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "SchedulerSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyVersion" ADD CONSTRAINT "SchedulerSurveyVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyQuestion" ADD CONSTRAINT "SchedulerSurveyQuestion_surveyVersionId_fkey" FOREIGN KEY ("surveyVersionId") REFERENCES "SchedulerSurveyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyService" ADD CONSTRAINT "SchedulerSurveyService_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "SchedulerSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyService" ADD CONSTRAINT "SchedulerSurveyService_serviceProfileId_fkey" FOREIGN KEY ("serviceProfileId") REFERENCES "SchedulerServiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyToken" ADD CONSTRAINT "SchedulerSurveyToken_surveyVersionId_fkey" FOREIGN KEY ("surveyVersionId") REFERENCES "SchedulerSurveyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyToken" ADD CONSTRAINT "SchedulerSurveyToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyToken" ADD CONSTRAINT "SchedulerSurveyToken_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "SchedulerAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyResponse" ADD CONSTRAINT "SchedulerSurveyResponse_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "SchedulerSurveyToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyResponse" ADD CONSTRAINT "SchedulerSurveyResponse_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyResponse" ADD CONSTRAINT "SchedulerSurveyResponse_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "SchedulerAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyAnswer" ADD CONSTRAINT "SchedulerSurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SchedulerSurveyResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchedulerSurveyAnswer" ADD CONSTRAINT "SchedulerSurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SchedulerSurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "prevent_scheduler_engagement_history_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SchedulerMessageTemplateVersion_append_only" BEFORE UPDATE OR DELETE ON "SchedulerMessageTemplateVersion" FOR EACH ROW EXECUTE FUNCTION "prevent_scheduler_engagement_history_mutation"();
CREATE TRIGGER "SchedulerMessageDeliveryEvent_append_only" BEFORE UPDATE OR DELETE ON "SchedulerMessageDeliveryEvent" FOR EACH ROW EXECUTE FUNCTION "prevent_scheduler_engagement_history_mutation"();
CREATE TRIGGER "SchedulerConsentTemplateVersion_append_only" BEFORE UPDATE OR DELETE ON "SchedulerConsentTemplateVersion" FOR EACH ROW EXECUTE FUNCTION "prevent_scheduler_engagement_history_mutation"();
CREATE TRIGGER "SchedulerSurveyVersion_append_only" BEFORE UPDATE OR DELETE ON "SchedulerSurveyVersion" FOR EACH ROW EXECUTE FUNCTION "prevent_scheduler_engagement_history_mutation"();
CREATE TRIGGER "SchedulerSurveyQuestion_append_only" BEFORE UPDATE OR DELETE ON "SchedulerSurveyQuestion" FOR EACH ROW EXECUTE FUNCTION "prevent_scheduler_engagement_history_mutation"();
CREATE TRIGGER "SchedulerSurveyResponse_append_only" BEFORE UPDATE OR DELETE ON "SchedulerSurveyResponse" FOR EACH ROW EXECUTE FUNCTION "prevent_scheduler_engagement_history_mutation"();
CREATE TRIGGER "SchedulerSurveyAnswer_append_only" BEFORE UPDATE OR DELETE ON "SchedulerSurveyAnswer" FOR EACH ROW EXECUTE FUNCTION "prevent_scheduler_engagement_history_mutation"();

CREATE FUNCTION "protect_scheduler_message_outbox_identity"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Scheduler message outbox rows cannot be deleted';
  END IF;
  IF NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey"
    OR NEW."requestHash" IS DISTINCT FROM OLD."requestHash"
    OR NEW."appointmentId" IS DISTINCT FROM OLD."appointmentId"
    OR NEW."customerId" IS DISTINCT FROM OLD."customerId"
    OR NEW."branchProfileId" IS DISTINCT FROM OLD."branchProfileId"
    OR NEW."templateVersionId" IS DISTINCT FROM OLD."templateVersionId"
    OR NEW."channel" IS DISTINCT FROM OLD."channel"
    OR NEW."destinationCiphertext" IS DISTINCT FROM OLD."destinationCiphertext"
    OR NEW."destinationIv" IS DISTINCT FROM OLD."destinationIv"
    OR NEW."destinationAuthTag" IS DISTINCT FROM OLD."destinationAuthTag"
    OR NEW."encryptionKeyVersion" IS DISTINCT FROM OLD."encryptionKeyVersion"
    OR NEW."variablesSnapshot" IS DISTINCT FROM OLD."variablesSnapshot"
    OR NEW."scheduledAt" IS DISTINCT FROM OLD."scheduledAt"
    OR NEW."createdByUserId" IS DISTINCT FROM OLD."createdByUserId"
  THEN
    RAISE EXCEPTION 'Scheduler message outbox identity and content are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SchedulerMessageOutbox_protect_identity" BEFORE UPDATE OR DELETE ON "SchedulerMessageOutbox" FOR EACH ROW EXECUTE FUNCTION "protect_scheduler_message_outbox_identity"();

CREATE FUNCTION "protect_scheduler_consent_evidence"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Scheduler consent records cannot be deleted';
  END IF;
  IF OLD."signatureEvidenceHash" IS NOT NULL AND (
    NEW."signatureEvidenceHash" IS DISTINCT FROM OLD."signatureEvidenceHash"
    OR NEW."signedStoragePath" IS DISTINCT FROM OLD."signedStoragePath"
    OR NEW."signedAt" IS DISTINCT FROM OLD."signedAt"
  ) THEN
    RAISE EXCEPTION 'Scheduler signed consent evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SchedulerConsentRecord_protect_evidence" BEFORE UPDATE OR DELETE ON "SchedulerConsentRecord" FOR EACH ROW EXECUTE FUNCTION "protect_scheduler_consent_evidence"();
