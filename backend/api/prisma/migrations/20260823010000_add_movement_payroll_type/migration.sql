-- Route fines to the payroll component where they must be deducted.
CREATE TYPE "PayrollMovementPayrollType" AS ENUM (
    'FIXED_SALARY',
    'SPECIALIST',
    'COMMISSION',
    'MANAGEMENT_COMMISSION'
);

ALTER TABLE "PayrollMovement"
ADD COLUMN "payrollType" "PayrollMovementPayrollType";

-- Before this field existed, every fine was shown as part of commissions.
UPDATE "PayrollMovement"
SET "payrollType" = 'COMMISSION'
WHERE "kind" = 'FINE';

ALTER TABLE "PayrollMovement"
ADD CONSTRAINT "PayrollMovement_fine_payroll_type_check"
CHECK (
    ("kind" = 'FINE' AND "payrollType" IS NOT NULL)
    OR
    ("kind" <> 'FINE' AND "payrollType" IS NULL)
);

-- Preserve access for positions that could already consult commissions.
INSERT INTO "PositionPayrollScreenPermission" (
    "id",
    "positionId",
    "screenKey",
    "allowed",
    "canWrite",
    "creadoEn",
    "actualizadoEn"
)
SELECT
    'pmc-' || md5("positionId"),
    "positionId",
    'payroll/nomina-comisiones-gerencia',
    "allowed",
    "canWrite",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "PositionPayrollScreenPermission"
WHERE "screenKey" = 'payroll/nomina-comisiones'
ON CONFLICT ("positionId", "screenKey") DO NOTHING;
