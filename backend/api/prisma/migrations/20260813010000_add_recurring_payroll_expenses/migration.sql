-- Recurring payroll expenses are stored as versioned rules. PayrollExpense
-- remains the immutable occurrence attached to a payroll run.

ALTER TABLE "PayrollExpense"
ADD COLUMN "recurrenceId" TEXT,
ADD COLUMN "recurrenceVersionId" TEXT,
ADD COLUMN "generated" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PayrollExpenseRecurrence" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "endedAt" DATE,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollExpenseRecurrence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollExpenseRecurrenceVersion" (
    "id" TEXT NOT NULL,
    "recurrenceId" TEXT NOT NULL,
    "anchorDate" DATE NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "kind" "PayrollExpenseKind" NOT NULL,
    "concept" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "branchId" TEXT,
    "costCenter" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "PayrollExpenseFrequency" NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollExpenseRecurrenceVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PayrollExpenseRecurrence_active_idx" ON "PayrollExpenseRecurrence"("active");
CREATE UNIQUE INDEX "PayrollExpenseRecurrenceVersion_recurrenceId_effectiveFrom_key" ON "PayrollExpenseRecurrenceVersion"("recurrenceId", "effectiveFrom");
CREATE INDEX "PayrollExpenseRecurrenceVersion_effectiveFrom_effectiveTo_idx" ON "PayrollExpenseRecurrenceVersion"("effectiveFrom", "effectiveTo");
CREATE INDEX "PayrollExpenseRecurrenceVersion_branchId_idx" ON "PayrollExpenseRecurrenceVersion"("branchId");
CREATE INDEX "PayrollExpense_recurrenceId_date_idx" ON "PayrollExpense"("recurrenceId", "date");
CREATE UNIQUE INDEX "PayrollExpense_recurrenceVersionId_date_key" ON "PayrollExpense"("recurrenceVersionId", "date");

ALTER TABLE "PayrollExpenseRecurrence" ADD CONSTRAINT "PayrollExpenseRecurrence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollExpenseRecurrenceVersion" ADD CONSTRAINT "PayrollExpenseRecurrenceVersion_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "PayrollExpenseRecurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollExpenseRecurrenceVersion" ADD CONSTRAINT "PayrollExpenseRecurrenceVersion_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollExpenseRecurrenceVersion" ADD CONSTRAINT "PayrollExpenseRecurrenceVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollExpense" ADD CONSTRAINT "PayrollExpense_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "PayrollExpenseRecurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollExpense" ADD CONSTRAINT "PayrollExpense_recurrenceVersionId_fkey" FOREIGN KEY ("recurrenceVersionId") REFERENCES "PayrollExpenseRecurrenceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PayrollExpenseRecurrenceVersion" ADD CONSTRAINT "PayrollExpenseRecurrenceVersion_amount_check" CHECK ("amount" > 0);
ALTER TABLE "PayrollExpenseRecurrenceVersion" ADD CONSTRAINT "PayrollExpenseRecurrenceVersion_frequency_check" CHECK ("frequency" <> 'ONE_TIME');
ALTER TABLE "PayrollExpense" ADD CONSTRAINT "PayrollExpense_recurrence_pair_check" CHECK (("recurrenceId" IS NULL AND "recurrenceVersionId" IS NULL) OR ("recurrenceId" IS NOT NULL AND "recurrenceVersionId" IS NOT NULL));
