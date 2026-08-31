-- Bind sensitive system identities to immutable employee IDs instead of display names.
-- A clean database may legitimately have no employees yet; populated databases must
-- contain exactly one historical Keysar Home candidate or the migration stops.
DO $$
DECLARE
    employee_count INTEGER;
    candidate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO employee_count FROM "Empleado";
    SELECT COUNT(*) INTO candidate_count
    FROM "Empleado"
    WHERE REGEXP_REPLACE(UPPER("nombreCompleto"), '[^A-Z0-9]+', '', 'g') = 'KEYSARHOME';

    IF candidate_count > 1 OR (employee_count > 0 AND candidate_count <> 1) THEN
        RAISE EXCEPTION
            'Protected identity KEYSAR_HOME requires exactly one employee candidate; found % among % employees',
            candidate_count,
            employee_count;
    END IF;
END $$;

CREATE TYPE "ProtectedEmployeeKey" AS ENUM ('KEYSAR_HOME');

CREATE TABLE "ProtectedEmployeeIdentity" (
    "key" "ProtectedEmployeeKey" NOT NULL,
    "employeeId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtectedEmployeeIdentity_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "ProtectedEmployeeIdentity_employeeId_key"
ON "ProtectedEmployeeIdentity"("employeeId");

ALTER TABLE "ProtectedEmployeeIdentity"
ADD CONSTRAINT "ProtectedEmployeeIdentity_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ProtectedEmployeeIdentity" (
    "key",
    "employeeId",
    "creadoEn",
    "actualizadoEn"
)
SELECT
    'KEYSAR_HOME'::"ProtectedEmployeeKey",
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Empleado"
WHERE REGEXP_REPLACE(UPPER("nombreCompleto"), '[^A-Z0-9]+', '', 'g') = 'KEYSARHOME';
