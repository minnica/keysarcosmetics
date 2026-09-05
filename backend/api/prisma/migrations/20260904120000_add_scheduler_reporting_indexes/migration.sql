-- Fase 8 de Scheduler: índices aditivos para reportes y exportaciones.
-- No crea datos, no reescribe históricos y no altera las fuentes financieras.

CREATE INDEX "SchedulerAppointmentStateHistory_toStatus_creadoEn_idx"
  ON "SchedulerAppointmentStateHistory"("toStatus", "creadoEn");

CREATE INDEX "SchedulerCommissionPolicy_commerceId_targetType_active_idx"
  ON "SchedulerCommissionPolicy"("commerceId", "targetType", "active");

CREATE INDEX "SchedulerMessageOutbox_branchProfileId_channel_status_scheduledAt_idx"
  ON "SchedulerMessageOutbox"("branchProfileId", "channel", "status", "scheduledAt");

CREATE INDEX "SchedulerSurveyResponse_submittedAt_idx"
  ON "SchedulerSurveyResponse"("submittedAt");
