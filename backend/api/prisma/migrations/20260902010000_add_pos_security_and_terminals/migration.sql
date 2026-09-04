-- Fase 1 POS: migración exclusivamente aditiva.
-- No crea credenciales, grants de puestos, perfiles de sucursal ni terminales operativas.

CREATE TYPE "PosTerminalStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

CREATE TABLE "PosCredential" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT,
    "alias" TEXT NOT NULL,
    "aliasNormalized" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinFingerprint" VARCHAR(64) NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "offlineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosCredential_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PosCredential_exactly_one_owner_check"
      CHECK (("employeeId" IS NOT NULL)::int + ("userId" IS NOT NULL)::int = 1)
);

CREATE TABLE "PosMasterCredential" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosMasterCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosBranchProfile" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "address" TEXT,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Mexico_City',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosBranchProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosTerminal" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "PosTerminalStatus" NOT NULL DEFAULT 'ACTIVE',
    "branchId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "secretFingerprint" VARCHAR(64) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "registeredByUserId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosTerminal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosPermissionNode" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "grantable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PosPermissionNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PositionPosPermission" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "permissionNodeId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PositionPosPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MasterAuthorization" (
    "id" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "purpose" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(80),
    "entityId" TEXT,
    "scope" JSONB,
    "actorCredentialId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MasterAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(120) NOT NULL,
    "outcome" VARCHAR(32) NOT NULL,
    "actorCredentialId" TEXT,
    "terminalId" TEXT,
    "branchId" TEXT,
    "targetType" VARCHAR(80),
    "targetId" TEXT,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosCredential_employeeId_key" ON "PosCredential"("employeeId");
CREATE UNIQUE INDEX "PosCredential_userId_key" ON "PosCredential"("userId");
CREATE UNIQUE INDEX "PosCredential_aliasNormalized_key" ON "PosCredential"("aliasNormalized");
CREATE UNIQUE INDEX "PosCredential_pinFingerprint_key" ON "PosCredential"("pinFingerprint");
CREATE INDEX "PosCredential_active_aliasNormalized_idx" ON "PosCredential"("active", "aliasNormalized");
CREATE UNIQUE INDEX "PosMasterCredential_credentialId_key" ON "PosMasterCredential"("credentialId");
CREATE UNIQUE INDEX "PosBranchProfile_branchId_key" ON "PosBranchProfile"("branchId");
CREATE UNIQUE INDEX "PosBranchProfile_code_key" ON "PosBranchProfile"("code");
CREATE UNIQUE INDEX "PosTerminal_code_key" ON "PosTerminal"("code");
CREATE UNIQUE INDEX "PosTerminal_secretFingerprint_key" ON "PosTerminal"("secretFingerprint");
CREATE INDEX "PosTerminal_branchId_status_idx" ON "PosTerminal"("branchId", "status");
CREATE UNIQUE INDEX "PosPermissionNode_key_key" ON "PosPermissionNode"("key");
CREATE INDEX "PosPermissionNode_parentId_sortOrder_idx" ON "PosPermissionNode"("parentId", "sortOrder");
CREATE UNIQUE INDEX "PositionPosPermission_positionId_permissionNodeId_key" ON "PositionPosPermission"("positionId", "permissionNodeId");
CREATE INDEX "PositionPosPermission_permissionNodeId_idx" ON "PositionPosPermission"("permissionNodeId");
CREATE UNIQUE INDEX "MasterAuthorization_tokenHash_key" ON "MasterAuthorization"("tokenHash");
CREATE INDEX "MasterAuthorization_actorCredentialId_purpose_expiresAt_idx" ON "MasterAuthorization"("actorCredentialId", "purpose", "expiresAt");
CREATE INDEX "MasterAuthorization_terminalId_expiresAt_idx" ON "MasterAuthorization"("terminalId", "expiresAt");
CREATE INDEX "AuditLog_action_creadoEn_idx" ON "AuditLog"("action", "creadoEn");
CREATE INDEX "AuditLog_actorCredentialId_creadoEn_idx" ON "AuditLog"("actorCredentialId", "creadoEn");
CREATE INDEX "AuditLog_terminalId_creadoEn_idx" ON "AuditLog"("terminalId", "creadoEn");

ALTER TABLE "PosCredential" ADD CONSTRAINT "PosCredential_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosCredential" ADD CONSTRAINT "PosCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMasterCredential" ADD CONSTRAINT "PosMasterCredential_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "PosCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosBranchProfile" ADD CONSTRAINT "PosBranchProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosTerminal" ADD CONSTRAINT "PosTerminal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosPermissionNode" ADD CONSTRAINT "PosPermissionNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PosPermissionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PositionPosPermission" ADD CONSTRAINT "PositionPosPermission_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PositionPosPermission" ADD CONSTRAINT "PositionPosPermission_permissionNodeId_fkey" FOREIGN KEY ("permissionNodeId") REFERENCES "PosPermissionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MasterAuthorization" ADD CONSTRAINT "MasterAuthorization_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MasterAuthorization" ADD CONSTRAINT "MasterAuthorization_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorCredentialId_fkey" FOREIGN KEY ("actorCredentialId") REFERENCES "PosCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "PosTerminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sólo se siembra el catálogo técnico. No se otorgan permisos a ningún puesto.
INSERT INTO "PosPermissionNode" ("id", "key", "label", "parentId", "grantable", "sortOrder", "actualizadoEn") VALUES
('pos-root-sales', 'MODULE_SALES', 'Ventas', NULL, false, 10, CURRENT_TIMESTAMP),
('pos-root-customers', 'MODULE_CUSTOMERS', 'Clientes', NULL, false, 20, CURRENT_TIMESTAMP),
('pos-root-catalog', 'MODULE_CATALOG', 'Catálogo', NULL, false, 30, CURRENT_TIMESTAMP),
('pos-root-inventory', 'MODULE_INVENTORY', 'Inventario', NULL, false, 40, CURRENT_TIMESTAMP),
('pos-root-warehouse', 'MODULE_WAREHOUSE', 'Almacén', NULL, false, 50, CURRENT_TIMESTAMP),
('pos-root-operation', 'MODULE_OPERATION', 'Operación diaria', NULL, false, 60, CURRENT_TIMESTAMP),
('pos-root-admin', 'MODULE_ADMIN', 'Administración', NULL, false, 70, CURRENT_TIMESTAMP),
('pos-perm-dashboard-view', 'DASHBOARD_VIEW', 'Ver dashboard', 'pos-root-admin', true, 1, CURRENT_TIMESTAMP),
('pos-perm-sale-create', 'SALE_CREATE', 'Crear ventas', 'pos-root-sales', true, 1, CURRENT_TIMESTAMP),
('pos-perm-sale-view-own', 'SALE_VIEW_OWN', 'Ver ventas propias', 'pos-root-sales', true, 2, CURRENT_TIMESTAMP),
('pos-perm-sale-view-all', 'SALE_VIEW_ALL', 'Ver todas las ventas', 'pos-root-sales', true, 3, CURRENT_TIMESTAMP),
('pos-perm-sale-override-minimum', 'SALE_OVERRIDE_MINIMUM', 'Autorizar precio mínimo', 'pos-root-sales', true, 4, CURRENT_TIMESTAMP),
('pos-perm-customers-view', 'CUSTOMERS_VIEW', 'Ver clientes', 'pos-root-customers', true, 1, CURRENT_TIMESTAMP),
('pos-perm-customers-manage', 'CUSTOMERS_MANAGE', 'Administrar clientes', 'pos-root-customers', true, 2, CURRENT_TIMESTAMP),
('pos-perm-catalog-view', 'CATALOG_VIEW', 'Ver catálogo', 'pos-root-catalog', true, 1, CURRENT_TIMESTAMP),
('pos-perm-catalog-manage', 'CATALOG_MANAGE', 'Administrar catálogo', 'pos-root-catalog', true, 2, CURRENT_TIMESTAMP),
('pos-perm-inventory-view', 'INVENTORY_VIEW', 'Ver inventario', 'pos-root-inventory', true, 1, CURRENT_TIMESTAMP),
('pos-perm-inventory-audit', 'INVENTORY_AUDIT', 'Auditar inventario', 'pos-root-inventory', true, 2, CURRENT_TIMESTAMP),
('pos-perm-inventory-adjust', 'INVENTORY_ADJUST', 'Ajustar inventario', 'pos-root-inventory', true, 3, CURRENT_TIMESTAMP),
('pos-perm-warehouse-branch-request', 'WAREHOUSE_BRANCH_REQUEST', 'Solicitar a almacén', 'pos-root-warehouse', true, 1, CURRENT_TIMESTAMP),
('pos-perm-warehouse-manage', 'WAREHOUSE_MANAGE', 'Administrar almacén', 'pos-root-warehouse', true, 2, CURRENT_TIMESTAMP),
('pos-perm-payments-manage', 'PAYMENTS_MANAGE', 'Administrar pagos', 'pos-root-admin', true, 2, CURRENT_TIMESTAMP),
('pos-perm-vouchers-manage', 'VOUCHERS_MANAGE', 'Administrar vouchers', 'pos-root-admin', true, 3, CURRENT_TIMESTAMP),
('pos-perm-business-day-open', 'BUSINESS_DAY_OPEN', 'Abrir jornada', 'pos-root-operation', true, 1, CURRENT_TIMESTAMP),
('pos-perm-business-day-close', 'BUSINESS_DAY_CLOSE', 'Cerrar jornada', 'pos-root-operation', true, 2, CURRENT_TIMESTAMP),
('pos-perm-cash-manage', 'CASH_MANAGE', 'Administrar caja', 'pos-root-operation', true, 3, CURRENT_TIMESTAMP),
('pos-perm-reports-view', 'REPORTS_VIEW', 'Ver reportes', 'pos-root-admin', true, 4, CURRENT_TIMESTAMP),
('pos-perm-reports-costs', 'REPORTS_COSTS', 'Ver costos', 'pos-root-admin', true, 5, CURRENT_TIMESTAMP),
('pos-perm-employees-view', 'EMPLOYEES_VIEW', 'Ver empleados', 'pos-root-admin', true, 6, CURRENT_TIMESTAMP),
('pos-perm-employees-manage', 'EMPLOYEES_MANAGE', 'Administrar empleados', 'pos-root-admin', true, 7, CURRENT_TIMESTAMP),
('pos-perm-settings-manage', 'SETTINGS_MANAGE', 'Administrar configuración', 'pos-root-admin', true, 8, CURRENT_TIMESTAMP),
('pos-perm-terminals-manage', 'TERMINALS_MANAGE', 'Administrar terminales', 'pos-root-admin', true, 9, CURRENT_TIMESTAMP),
('pos-perm-authorizations-create', 'AUTHORIZATIONS_CREATE', 'Crear autorizaciones master', 'pos-root-admin', true, 10, CURRENT_TIMESTAMP);
