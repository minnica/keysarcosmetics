-- Expense categories are an independent active catalog. PayrollExpense keeps
-- the category name as a historical snapshot.

CREATE TABLE "PayrollExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollExpenseCategory_name_key" ON "PayrollExpenseCategory"("name");
CREATE INDEX "PayrollExpenseCategory_active_name_idx" ON "PayrollExpenseCategory"("active", "name");

ALTER TABLE "PayrollExpenseCategory" ADD CONSTRAINT "PayrollExpenseCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve categories already captured before the catalog existed. The
-- normalized name is unique and the creator comes from the oldest occurrence.
WITH "expenseCategorySources" AS (
    SELECT "category", "createdById", "createdAt"
    FROM "PayrollExpense"
    UNION ALL
    SELECT "category", "createdById", "createdAt"
    FROM "PayrollExpenseRecurrenceVersion"
)
INSERT INTO "PayrollExpenseCategory" (
    "id",
    "name",
    "active",
    "createdById",
    "createdAt",
    "updatedAt"
)
SELECT
    'expense-category-' || md5(UPPER(TRIM("category"))),
    UPPER(TRIM("category")),
    true,
    (array_agg("createdById" ORDER BY "createdAt" ASC))[1],
    MIN("createdAt"),
    CURRENT_TIMESTAMP
FROM "expenseCategorySources"
WHERE TRIM("category") <> ''
GROUP BY UPPER(TRIM("category"))
ON CONFLICT ("name") DO NOTHING;
