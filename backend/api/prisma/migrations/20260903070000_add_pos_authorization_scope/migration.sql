-- Fase 9 POS: autorización personal, sesiones revocables, alcance por sucursal
-- y árbol de destinos versionado. Migración exclusivamente aditiva.
-- No concede permisos ni sucursales a puestos/credenciales existentes.

ALTER TABLE "PosPermissionNode"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "PosPermissionNode" SET "version" = 2;

CREATE TABLE "PosPositionBranchAssignment" (
  "id" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosPositionBranchAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosCredentialBranchAssignment" (
  "id" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosCredentialBranchAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "credentialId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokeReason" VARCHAR(80),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosSession_revocation_check" CHECK (
    ("revokedAt" IS NULL AND "revokeReason" IS NULL) OR
    ("revokedAt" IS NOT NULL AND "revokeReason" IS NOT NULL)
  )
);

CREATE TABLE "PosPersonalAuthorization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenHash" VARCHAR(64) NOT NULL,
  "purpose" VARCHAR(80) NOT NULL,
  "scope" JSONB,
  "credentialId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "sessionId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosPersonalAuthorization_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosPersonalAuthorization_lifecycle_check" CHECK (
    NOT ("usedAt" IS NOT NULL AND "revokedAt" IS NOT NULL)
  )
);

ALTER TABLE "MasterAuthorization" ADD COLUMN "sessionId" UUID;

ALTER TABLE "PosTicketSeller"
  ADD COLUMN "clockedInSnapshot" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "presenceBranchIdSnapshot" TEXT,
  ADD COLUMN "attendanceIdSnapshot" UUID;

CREATE UNIQUE INDEX "PosPositionBranchAssignment_positionId_branchId_key"
  ON "PosPositionBranchAssignment"("positionId", "branchId");
CREATE INDEX "PosPositionBranchAssignment_branchId_idx"
  ON "PosPositionBranchAssignment"("branchId");
CREATE UNIQUE INDEX "PosCredentialBranchAssignment_credentialId_branchId_key"
  ON "PosCredentialBranchAssignment"("credentialId", "branchId");
CREATE INDEX "PosCredentialBranchAssignment_branchId_idx"
  ON "PosCredentialBranchAssignment"("branchId");
CREATE INDEX "PosSession_credentialId_revokedAt_expiresAt_idx"
  ON "PosSession"("credentialId", "revokedAt", "expiresAt");
CREATE INDEX "PosSession_terminalId_revokedAt_expiresAt_idx"
  ON "PosSession"("terminalId", "revokedAt", "expiresAt");
CREATE UNIQUE INDEX "PosPersonalAuthorization_tokenHash_key"
  ON "PosPersonalAuthorization"("tokenHash");
CREATE INDEX "PosPersonalAuthorization_credentialId_purpose_expiresAt_idx"
  ON "PosPersonalAuthorization"("credentialId", "purpose", "expiresAt");
CREATE INDEX "PosPersonalAuthorization_sessionId_expiresAt_idx"
  ON "PosPersonalAuthorization"("sessionId", "expiresAt");
CREATE INDEX "MasterAuthorization_sessionId_expiresAt_idx"
  ON "MasterAuthorization"("sessionId", "expiresAt");
CREATE INDEX "PosTicketSeller_presenceBranchIdSnapshot_clockedInSnapshot_idx"
  ON "PosTicketSeller"("presenceBranchIdSnapshot", "clockedInSnapshot");

ALTER TABLE "PosPositionBranchAssignment" ADD CONSTRAINT "PosPositionBranchAssignment_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosPositionBranchAssignment" ADD CONSTRAINT "PosPositionBranchAssignment_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCredentialBranchAssignment" ADD CONSTRAINT "PosCredentialBranchAssignment_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosCredentialBranchAssignment" ADD CONSTRAINT "PosCredentialBranchAssignment_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_terminalId_fkey"
  FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPersonalAuthorization" ADD CONSTRAINT "PosPersonalAuthorization_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPersonalAuthorization" ADD CONSTRAINT "PosPersonalAuthorization_terminalId_fkey"
  FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPersonalAuthorization" ADD CONSTRAINT "PosPersonalAuthorization_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "PosSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MasterAuthorization" ADD CONSTRAINT "MasterAuthorization_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "PosSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- El catálogo técnico v2 cubre cada destino y separa consulta, edición e impresión.
-- ON CONFLICT actualiza sólo metadatos; nunca crea grants operativos.
INSERT INTO "PosPermissionNode"
  ("id", "key", "label", "description", "parentId", "grantable", "sortOrder", "active", "version", "actualizadoEn")
VALUES
  ('pos-root-service', 'MODULE_SERVICE', 'Clientes y servicio', NULL, NULL, false, 25, true, 2, CURRENT_TIMESTAMP),
  ('pos-root-system', 'MODULE_SYSTEM', 'Sistema', NULL, NULL, false, 80, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-sale-view', 'SALE_VIEW', 'Abrir Ventas', NULL, 'pos-root-sales', true, 1, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-seller-sales-view', 'SELLER_SALES_VIEW', 'Ver Mis ventas', NULL, 'pos-root-sales', true, 10, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-seller-sales-print', 'SELLER_SALES_PRINT', 'Imprimir Mis ventas', NULL, 'pos-root-sales', true, 11, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-receipts-view', 'RECEIPTS_VIEW', 'Ver Receipts', NULL, 'pos-root-sales', true, 12, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-receipts-print', 'RECEIPTS_PRINT', 'Imprimir Receipts', NULL, 'pos-root-sales', true, 13, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-customers-print', 'CUSTOMERS_PRINT', 'Imprimir clientes', NULL, 'pos-root-customers', true, 3, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-appointments-view', 'APPOINTMENTS_VIEW', 'Ver citas', NULL, 'pos-root-service', true, 1, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-appointments-manage', 'APPOINTMENTS_MANAGE', 'Editar citas', NULL, 'pos-root-service', true, 2, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-appointments-print', 'APPOINTMENTS_PRINT', 'Imprimir citas', NULL, 'pos-root-service', true, 3, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-memberships-view', 'MEMBERSHIPS_VIEW', 'Ver membresías', NULL, 'pos-root-service', true, 4, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-memberships-manage', 'MEMBERSHIPS_MANAGE', 'Editar membresías', NULL, 'pos-root-service', true, 5, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-memberships-print', 'MEMBERSHIPS_PRINT', 'Imprimir membresías', NULL, 'pos-root-service', true, 6, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-competitions-view', 'COMPETITIONS_VIEW', 'Ver Competition', NULL, 'pos-root-service', true, 7, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-competitions-manage', 'COMPETITIONS_MANAGE', 'Editar Competition', NULL, 'pos-root-service', true, 8, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-websites-view', 'WEBSITES_VIEW', 'Ver Websites', NULL, 'pos-root-service', true, 9, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-inventory-manage', 'INVENTORY_MANAGE', 'Editar inventario', NULL, 'pos-root-inventory', true, 4, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-inventory-print', 'INVENTORY_PRINT', 'Imprimir inventario', NULL, 'pos-root-inventory', true, 5, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-inventory-movements-view', 'INVENTORY_MOVEMENTS_VIEW', 'Ver movimientos', NULL, 'pos-root-inventory', true, 6, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-inventory-movements-manage', 'INVENTORY_MOVEMENTS_MANAGE', 'Editar movimientos', NULL, 'pos-root-inventory', true, 7, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-inventory-movements-print', 'INVENTORY_MOVEMENTS_PRINT', 'Imprimir movimientos', NULL, 'pos-root-inventory', true, 8, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-warehouse-branch-view', 'WAREHOUSE_BRANCH_VIEW', 'Ver Pedido sucursales', NULL, 'pos-root-warehouse', true, 3, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-warehouse-branch-print', 'WAREHOUSE_BRANCH_PRINT', 'Imprimir Pedido sucursales', NULL, 'pos-root-warehouse', true, 4, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-warehouse-view', 'WAREHOUSE_VIEW', 'Ver Almacén matriz', NULL, 'pos-root-warehouse', true, 5, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-warehouse-print', 'WAREHOUSE_PRINT', 'Imprimir Almacén matriz', NULL, 'pos-root-warehouse', true, 6, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-suppliers-view', 'SUPPLIERS_VIEW', 'Ver proveedores', NULL, 'pos-root-warehouse', true, 7, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-suppliers-manage', 'SUPPLIERS_MANAGE', 'Editar proveedores', NULL, 'pos-root-warehouse', true, 8, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-suppliers-print', 'SUPPLIERS_PRINT', 'Imprimir proveedores', NULL, 'pos-root-warehouse', true, 9, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-deals-view', 'DEALS_VIEW', 'Ver Paquetes y promociones', NULL, 'pos-root-warehouse', true, 10, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-deals-manage', 'DEALS_MANAGE', 'Editar Paquetes y promociones', NULL, 'pos-root-warehouse', true, 11, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-deals-print', 'DEALS_PRINT', 'Imprimir Paquetes y promociones', NULL, 'pos-root-warehouse', true, 12, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-cash-view', 'CASH_VIEW', 'Ver Cash manager', NULL, 'pos-root-operation', true, 4, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-cash-print', 'CASH_PRINT', 'Imprimir Cash manager', NULL, 'pos-root-operation', true, 5, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-x-report-view', 'X_REPORT_VIEW', 'Ver X-Report', NULL, 'pos-root-operation', true, 6, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-x-report-print', 'X_REPORT_PRINT', 'Imprimir X-Report', NULL, 'pos-root-operation', true, 7, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-reports-print', 'REPORTS_PRINT', 'Imprimir reportes', NULL, 'pos-root-admin', true, 11, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-my-account-view', 'MY_ACCOUNT_VIEW', 'Ver My Account personal', NULL, 'pos-root-admin', true, 12, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-settings-view', 'SETTINGS_VIEW', 'Ver Settings', NULL, 'pos-root-system', true, 1, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-data-update-view', 'DATA_UPDATE_VIEW', 'Ver Data update', NULL, 'pos-root-system', true, 2, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-data-update-manage', 'DATA_UPDATE_MANAGE', 'Editar Data update', NULL, 'pos-root-system', true, 3, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-clock-in-view', 'CLOCK_IN_VIEW', 'Ver Clock In', NULL, 'pos-root-system', true, 4, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-session-exit', 'SESSION_EXIT', 'Salir sin Close day', NULL, 'pos-root-system', true, 5, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-bank-reconciliation-view', 'BANK_RECONCILIATION_VIEW', 'Ver conciliación bancaria', NULL, 'pos-root-admin', true, 13, true, 2, CURRENT_TIMESTAMP),
  ('pos-perm-bank-reconciliation-print', 'BANK_RECONCILIATION_PRINT', 'Imprimir conciliación bancaria', NULL, 'pos-root-admin', true, 14, true, 2, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "parentId" = EXCLUDED."parentId",
  "grantable" = EXCLUDED."grantable",
  "sortOrder" = EXCLUDED."sortOrder",
  "active" = EXCLUDED."active",
  "version" = EXCLUDED."version",
  "actualizadoEn" = CURRENT_TIMESTAMP;
