-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "PayrollCalculationMode" AS ENUM ('WITH_VAT', 'WITHOUT_VAT');

-- CreateEnum
CREATE TYPE "PayrollMovementKind" AS ENUM ('BONUS', 'ADJUSTMENT_POSITIVE', 'ADJUSTMENT_NEGATIVE', 'FINE', 'PER_DIEM', 'SUPPLIES');

-- CreateEnum
CREATE TYPE "PayrollMovementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollCatalogKind" AS ENUM ('BONUS', 'FINE', 'PER_DIEM');

-- CreateEnum
CREATE TYPE "PayrollExpenseKind" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "PayrollExpenseFrequency" AS ENUM ('ONE_TIME', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "LoanAdvanceKind" AS ENUM ('LOAN', 'PAYROLL_ADVANCE');

-- CreateEnum
CREATE TYPE "LoanAdvanceStatus" AS ENUM ('PENDING', 'PAID', 'LOST', 'CANCELED');

-- CreateEnum
CREATE TYPE "LoanInstallmentStatus" AS ENUM ('SCHEDULED', 'RESERVED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "PayrollReceiptStatus" AS ENUM ('GENERATED', 'SENT', 'CONFIRMED');

-- CreateTable
CREATE TABLE "PayrollCatalogItem" (
    "id" TEXT NOT NULL,
    "kind" "PayrollCatalogKind" NOT NULL,
    "name" TEXT NOT NULL,
    "defaultAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionScheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionSchemeVersion" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionSchemeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionSchemeTier" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "fromAmount" DECIMAL(14,2) NOT NULL,
    "toAmount" DECIMAL(14,2),
    "rate" DECIMAL(8,6) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "CommissionSchemeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCommissionAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCommissionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "payDate" DATE NOT NULL,
    "mode" "PayrollCalculationMode" NOT NULL,
    "vatRate" DECIMAL(8,6) NOT NULL DEFAULT 0.16,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "salesWithVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salesWithoutVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expenseTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payrollTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "generalBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "paidById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunLine" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "positionName" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "phoneNumber" TEXT,
    "schemeName" TEXT,
    "schemeVersion" INTEGER,
    "individualRate" DECIMAL(8,6),
    "monthlySalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salaryPayment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salesWithVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salesWithoutVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fine" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjustmentPositive" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjustmentNegative" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "perDiem" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "supplies" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "loanPayment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPayment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRunLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunBranchLine" (
    "id" TEXT NOT NULL,
    "payrollRunLineId" TEXT NOT NULL,
    "branchId" TEXT,
    "branchName" TEXT NOT NULL,
    "salesWithVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salesWithoutVat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fine" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salaryPayment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjustmentPositive" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjustmentNegative" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "perDiem" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "supplies" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "loanPayment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "PayrollRunBranchLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollMovement" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "PayrollMovementKind" NOT NULL,
    "catalogItemId" TEXT,
    "concept" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "status" "PayrollMovementStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "payrollRunId" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollMovementAllocation" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "commissionable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PayrollMovementAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAttachment" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollExpense" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "PayrollExpenseKind" NOT NULL,
    "concept" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "branchId" TEXT,
    "costCenter" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "PayrollExpenseFrequency" NOT NULL,
    "notes" TEXT,
    "payrollRunId" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanAdvance" (
    "id" TEXT NOT NULL,
    "requestedAt" DATE NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" "LoanAdvanceKind" NOT NULL,
    "requestedAmount" DECIMAL(14,2) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL,
    "status" "LoanAdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanAdvanceInstallment" (
    "id" TEXT NOT NULL,
    "loanAdvanceId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "LoanInstallmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "payrollRunId" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "LoanAdvanceInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollReceipt" (
    "id" TEXT NOT NULL,
    "payrollRunLineId" TEXT NOT NULL,
    "status" "PayrollReceiptStatus" NOT NULL DEFAULT 'GENERATED',
    "sentAt" TIMESTAMP(3),
    "sentById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollCatalogItem_kind_active_idx" ON "PayrollCatalogItem"("kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollCatalogItem_kind_name_key" ON "PayrollCatalogItem"("kind", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionScheme_name_key" ON "CommissionScheme"("name");

-- CreateIndex
CREATE INDEX "CommissionSchemeVersion_effectiveFrom_idx" ON "CommissionSchemeVersion"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionSchemeVersion_schemeId_version_key" ON "CommissionSchemeVersion"("schemeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionSchemeVersion_schemeId_effectiveFrom_key" ON "CommissionSchemeVersion"("schemeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionSchemeTier_versionId_sortOrder_key" ON "CommissionSchemeTier"("versionId", "sortOrder");

-- CreateIndex
CREATE INDEX "EmployeeCommissionAssignment_employeeId_effectiveFrom_effec_idx" ON "EmployeeCommissionAssignment"("employeeId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "EmployeeCommissionAssignment_schemeId_idx" ON "EmployeeCommissionAssignment"("schemeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCommissionAssignment_employeeId_effectiveFrom_key" ON "EmployeeCommissionAssignment"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PayrollRun_periodStart_periodEnd_idx" ON "PayrollRun"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PayrollRun_status_periodStart_idx" ON "PayrollRun"("status", "periodStart");

-- CreateIndex
CREATE INDEX "PayrollRunLine_employeeId_idx" ON "PayrollRunLine"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRunLine_payrollRunId_employeeId_key" ON "PayrollRunLine"("payrollRunId", "employeeId");

-- CreateIndex
CREATE INDEX "PayrollRunBranchLine_branchId_idx" ON "PayrollRunBranchLine"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRunBranchLine_payrollRunLineId_branchName_key" ON "PayrollRunBranchLine"("payrollRunLineId", "branchName");

-- CreateIndex
CREATE INDEX "PayrollMovement_date_status_idx" ON "PayrollMovement"("date", "status");

-- CreateIndex
CREATE INDEX "PayrollMovement_payrollRunId_idx" ON "PayrollMovement"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollMovementAllocation_employeeId_idx" ON "PayrollMovementAllocation"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollMovementAllocation_branchId_idx" ON "PayrollMovementAllocation"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollMovementAllocation_movementId_employeeId_key" ON "PayrollMovementAllocation"("movementId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollAttachment_storagePath_key" ON "PayrollAttachment"("storagePath");

-- CreateIndex
CREATE INDEX "PayrollAttachment_movementId_idx" ON "PayrollAttachment"("movementId");

-- CreateIndex
CREATE INDEX "PayrollExpense_date_deletedAt_idx" ON "PayrollExpense"("date", "deletedAt");

-- CreateIndex
CREATE INDEX "PayrollExpense_payrollRunId_idx" ON "PayrollExpense"("payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollExpense_branchId_idx" ON "PayrollExpense"("branchId");

-- CreateIndex
CREATE INDEX "LoanAdvance_employeeId_status_idx" ON "LoanAdvance"("employeeId", "status");

-- CreateIndex
CREATE INDEX "LoanAdvance_requestedAt_idx" ON "LoanAdvance"("requestedAt");

-- CreateIndex
CREATE INDEX "LoanAdvanceInstallment_periodStart_periodEnd_status_idx" ON "LoanAdvanceInstallment"("periodStart", "periodEnd", "status");

-- CreateIndex
CREATE INDEX "LoanAdvanceInstallment_payrollRunId_idx" ON "LoanAdvanceInstallment"("payrollRunId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanAdvanceInstallment_loanAdvanceId_sequence_key" ON "LoanAdvanceInstallment"("loanAdvanceId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollReceipt_payrollRunLineId_key" ON "PayrollReceipt"("payrollRunLineId");

-- CreateIndex
CREATE INDEX "PayrollReceipt_status_createdAt_idx" ON "PayrollReceipt"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PayrollAuditEvent_entityType_entityId_createdAt_idx" ON "PayrollAuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "PayrollAuditEvent_userId_createdAt_idx" ON "PayrollAuditEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PayrollCatalogItem" ADD CONSTRAINT "PayrollCatalogItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSchemeVersion" ADD CONSTRAINT "CommissionSchemeVersion_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "CommissionScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSchemeVersion" ADD CONSTRAINT "CommissionSchemeVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionSchemeTier" ADD CONSTRAINT "CommissionSchemeTier_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CommissionSchemeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCommissionAssignment" ADD CONSTRAINT "EmployeeCommissionAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCommissionAssignment" ADD CONSTRAINT "EmployeeCommissionAssignment_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "CommissionScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCommissionAssignment" ADD CONSTRAINT "EmployeeCommissionAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunLine" ADD CONSTRAINT "PayrollRunLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunLine" ADD CONSTRAINT "PayrollRunLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunBranchLine" ADD CONSTRAINT "PayrollRunBranchLine_payrollRunLineId_fkey" FOREIGN KEY ("payrollRunLineId") REFERENCES "PayrollRunLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunBranchLine" ADD CONSTRAINT "PayrollRunBranchLine_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollMovement" ADD CONSTRAINT "PayrollMovement_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "PayrollCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollMovement" ADD CONSTRAINT "PayrollMovement_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollMovement" ADD CONSTRAINT "PayrollMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollMovement" ADD CONSTRAINT "PayrollMovement_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollMovementAllocation" ADD CONSTRAINT "PayrollMovementAllocation_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "PayrollMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollMovementAllocation" ADD CONSTRAINT "PayrollMovementAllocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollMovementAllocation" ADD CONSTRAINT "PayrollMovementAllocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAttachment" ADD CONSTRAINT "PayrollAttachment_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "PayrollMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollExpense" ADD CONSTRAINT "PayrollExpense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollExpense" ADD CONSTRAINT "PayrollExpense_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollExpense" ADD CONSTRAINT "PayrollExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAdvance" ADD CONSTRAINT "LoanAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAdvance" ADD CONSTRAINT "LoanAdvance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAdvanceInstallment" ADD CONSTRAINT "LoanAdvanceInstallment_loanAdvanceId_fkey" FOREIGN KEY ("loanAdvanceId") REFERENCES "LoanAdvance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAdvanceInstallment" ADD CONSTRAINT "LoanAdvanceInstallment_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollReceipt" ADD CONSTRAINT "PayrollReceipt_payrollRunLineId_fkey" FOREIGN KEY ("payrollRunLineId") REFERENCES "PayrollRunLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollReceipt" ADD CONSTRAINT "PayrollReceipt_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollReceipt" ADD CONSTRAINT "PayrollReceipt_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAuditEvent" ADD CONSTRAINT "PayrollAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Payroll invariants that Prisma cannot express directly.
ALTER TABLE "PayrollRun"
  ADD CONSTRAINT "PayrollRun_standard_period_check" CHECK (
    (EXTRACT(DAY FROM "periodStart") = 1 AND EXTRACT(DAY FROM "periodEnd") = 15 AND DATE_TRUNC('month', "periodStart") = DATE_TRUNC('month', "periodEnd"))
    OR
    (EXTRACT(DAY FROM "periodStart") = 16 AND "periodEnd" = (DATE_TRUNC('month', "periodStart") + INTERVAL '1 month - 1 day')::date)
  ),
  ADD CONSTRAINT "PayrollRun_pay_date_check" CHECK ("payDate" >= "periodEnd"),
  ADD CONSTRAINT "PayrollRun_vat_rate_check" CHECK ("vatRate" >= 0 AND "vatRate" < 1);

ALTER TABLE "CommissionSchemeTier"
  ADD CONSTRAINT "CommissionSchemeTier_amounts_check" CHECK ("fromAmount" >= 0 AND ("toAmount" IS NULL OR "toAmount" >= "fromAmount")),
  ADD CONSTRAINT "CommissionSchemeTier_rate_check" CHECK ("rate" >= 0 AND "rate" <= 1);

ALTER TABLE "PayrollCatalogItem" ADD CONSTRAINT "PayrollCatalogItem_amount_check" CHECK ("defaultAmount" > 0);
ALTER TABLE "PayrollMovement" ADD CONSTRAINT "PayrollMovement_amount_check" CHECK ("totalAmount" > 0);
ALTER TABLE "PayrollMovementAllocation" ADD CONSTRAINT "PayrollMovementAllocation_amount_check" CHECK ("amount" > 0);
ALTER TABLE "PayrollExpense" ADD CONSTRAINT "PayrollExpense_amount_check" CHECK ("amount" > 0);
ALTER TABLE "LoanAdvance"
  ADD CONSTRAINT "LoanAdvance_amount_check" CHECK ("requestedAmount" > 0 AND "installmentAmount" > 0 AND "paidAmount" >= 0 AND "balance" >= 0),
  ADD CONSTRAINT "LoanAdvance_count_check" CHECK ("installmentCount" > 0);
ALTER TABLE "LoanAdvanceInstallment" ADD CONSTRAINT "LoanAdvanceInstallment_amount_check" CHECK ("amount" > 0);

-- Prevent two active payroll runs from consuming the same dates.
ALTER TABLE "PayrollRun"
  ADD CONSTRAINT "PayrollRun_no_active_period_overlap"
  EXCLUDE USING GIST (daterange("periodStart", "periodEnd", '[]') WITH &&)
  WHERE ("status" <> 'CANCELED');
