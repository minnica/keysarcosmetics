-- Add read-only mode to existing Payroll screen permissions.
-- The default preserves write access for every existing permission.
ALTER TABLE "PositionPayrollScreenPermission"
ADD COLUMN "canWrite" BOOLEAN NOT NULL DEFAULT true;
