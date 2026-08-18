-- Keep category names as immutable snapshots while linking future occurrences
-- and recurring versions to the editable category catalog.

ALTER TABLE "PayrollExpense" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "PayrollExpenseRecurrenceVersion" ADD COLUMN "categoryId" TEXT;

UPDATE "PayrollExpense" AS expense
SET "categoryId" = category."id"
FROM "PayrollExpenseCategory" AS category
WHERE category."name" = UPPER(TRIM(expense."category"));

UPDATE "PayrollExpenseRecurrenceVersion" AS version
SET "categoryId" = category."id"
FROM "PayrollExpenseCategory" AS category
WHERE category."name" = UPPER(TRIM(version."category"));

CREATE INDEX "PayrollExpense_categoryId_idx" ON "PayrollExpense"("categoryId");
CREATE INDEX "PayrollExpenseRecurrenceVersion_categoryId_idx" ON "PayrollExpenseRecurrenceVersion"("categoryId");

ALTER TABLE "PayrollExpense" ADD CONSTRAINT "PayrollExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PayrollExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollExpenseRecurrenceVersion" ADD CONSTRAINT "PayrollExpenseRecurrenceVersion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PayrollExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
