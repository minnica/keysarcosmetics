"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, apiErrorMessage } from "@/lib/api";
import type {
  BranchBreakdownLine,
  CatalogKind,
  CommissionScheme,
  EmployeeBranchBreakdown,
  LoanAdvance,
  MovementKind,
  MovementStatus,
  PayrollBranch,
  PayrollCalculationMode,
  PayrollCatalogItem,
  PayrollEmployee,
  PayrollExpense,
  PayrollMovement,
  PayrollReceipt,
  PayrollRun,
  PayrollRunLine,
  PayrollRunSummary,
  SchemeAssignment,
} from "@/lib/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

const PAYROLL_CALCULATION_TIMEOUT_MS = 120_000;

const n = (value: unknown) => Number(value ?? 0);
const d = (value: unknown) =>
  typeof value === "string" ? value.slice(0, 10) : "";

function mapCatalog(raw: any): PayrollCatalogItem {
  return {
    id: raw.id,
    kind: raw.kind,
    name: raw.name,
    amount: n(raw.defaultAmount),
    notes: raw.notes ?? "",
    active: raw.active,
  };
}

function mapScheme(raw: any): CommissionScheme {
  const versions = (raw.versions ?? []).map((version: any) => ({
    id: version.id,
    version: version.version,
    effectiveFrom: d(version.effectiveFrom),
    tiers: (version.tiers ?? []).map((tier: any) => ({
      id: tier.id,
      from: n(tier.fromAmount),
      to: tier.toAmount == null ? null : n(tier.toAmount),
      rate: n(tier.rate),
    })),
  }));
  return {
    id: raw.id,
    name: raw.name,
    active: raw.active,
    versions,
    ranges: versions[0]?.tiers ?? [],
  };
}

function mapAssignment(raw: any): SchemeAssignment {
  return {
    id: raw.id,
    employeeId: raw.employeeId,
    employeeName: raw.employee?.nombreCompleto ?? "",
    employeeActive: raw.employee?.activo ?? false,
    schemeId: raw.schemeId,
    schemeName: raw.scheme?.name ?? "",
    effectiveFrom: d(raw.effectiveFrom),
    effectiveTo: raw.effectiveTo ? d(raw.effectiveTo) : null,
  };
}

function mapMovement(raw: any): PayrollMovement {
  const allocations = (raw.allocations ?? []).map((allocation: any) => ({
    id: allocation.id,
    employeeId: allocation.employeeId,
    employeeName:
      allocation.employee?.nombreCompleto ?? allocation.employeeName ?? "",
    branchId: allocation.branchId ?? null,
    branchName:
      allocation.branch?.nombre ?? allocation.branchName ?? "CORPORATIVO",
    amount: n(allocation.amount),
    commissionable: allocation.commissionable,
  }));
  const negative = raw.kind === "FINE" || raw.kind === "ADJUSTMENT_NEGATIVE";
  return {
    id: raw.id,
    date: d(raw.date),
    kind: raw.kind,
    catalogItemId: raw.catalogItemId ?? null,
    concept: raw.concept,
    totalAmount: n(raw.totalAmount),
    amount: negative ? -n(raw.totalAmount) : n(raw.totalAmount),
    status: raw.status,
    notes: raw.notes ?? "",
    payrollRunId: raw.payrollRunId ?? null,
    allocations,
    employeeName: allocations.map((item: any) => item.employeeName).join(", "),
    branch: [...new Set(allocations.map((item: any) => item.branchName))].join(
      ", ",
    ),
    sharedWith: allocations.length,
    attachments: (raw.attachments ?? []).map((attachment: any) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })),
  };
}

function mapExpense(raw: any): PayrollExpense {
  return {
    id: raw.id,
    date: d(raw.date),
    kind: raw.kind,
    concept: raw.concept,
    category: raw.category,
    branchId: raw.branchId ?? null,
    branch: raw.branch?.nombre ?? raw.costCenter,
    amount: n(raw.amount),
    frequency: raw.frequency,
    notes: raw.notes ?? "",
    payrollRunId: raw.payrollRunId ?? null,
  };
}

function mapLoan(raw: any): LoanAdvance {
  const installments = (raw.installments ?? []).map((item: any) => ({
    id: item.id,
    sequence: item.sequence,
    periodStart: d(item.periodStart),
    periodEnd: d(item.periodEnd),
    amount: n(item.amount),
    status: item.status,
  }));
  const next = installments.find(
    (item: any) => item.status === "SCHEDULED" || item.status === "RESERVED",
  );
  return {
    id: raw.id,
    requestedAt: d(raw.requestedAt),
    employeeId: raw.employeeId,
    employeeName: raw.employee?.nombreCompleto ?? "",
    employeeActive: raw.employee?.activo ?? false,
    kind: raw.kind,
    nature: raw.kind === "LOAN" ? "PRÉSTAMO" : "ADELANTO DE NÓMINA",
    requestedAmount: n(raw.requestedAmount),
    installmentCount: raw.installmentCount,
    payments: raw.installmentCount,
    installmentAmount: n(raw.installmentAmount),
    paymentAmount: n(raw.installmentAmount),
    paidAmount: n(raw.paidAmount),
    balance: n(raw.balance),
    status: raw.status,
    notes: raw.notes ?? "",
    installments,
    nextPeriod: next
      ? `${d(next.periodStart)} A ${d(next.periodEnd)}`
      : raw.status === "PAID"
        ? "LIQUIDADO"
        : "SIN CUOTAS PENDIENTES",
  };
}

function mapRunLine(raw: any): PayrollRunLine {
  const branchLines = (raw.branchLines ?? []).map((branch: any) => ({
    id: branch.id,
    branchId: branch.branchId ?? null,
    branchName: branch.branchName,
    salesWithVat: n(branch.salesWithVat),
    salesWithoutVat: n(branch.salesWithoutVat),
    commission: n(branch.commission),
    bonus: n(branch.bonus),
    fine: n(branch.fine),
    salaryPayment: n(branch.salaryPayment),
    adjustmentPositive: n(branch.adjustmentPositive),
    adjustmentNegative: n(branch.adjustmentNegative),
    perDiem: n(branch.perDiem),
    supplies: n(branch.supplies),
    loanPayment: n(branch.loanPayment),
    totalCost: n(branch.totalCost),
  }));
  return {
    id: raw.id,
    employeeId: raw.employeeId,
    employeeName: raw.employeeName,
    position: raw.positionName ?? "SIN PUESTO",
    branch:
      branchLines
        .filter((branch: any) => branch.salesWithVat > 0)
        .map((branch: any) => branch.branchName)
        .join(", ") ||
      branchLines[0]?.branchName ||
      "CORPORATIVO",
    bankName: raw.bankName ?? null,
    accountNumber: raw.accountNumber ?? null,
    phoneNumber: raw.phoneNumber ?? null,
    scheme: raw.schemeName ?? "SIN ESQUEMA",
    schemeVersion: raw.schemeVersion ?? null,
    individualRate: n(raw.individualRate),
    monthlySalary: n(raw.monthlySalary),
    salaryBase: n(raw.salaryPayment),
    salesWithVat: n(raw.salesWithVat),
    salesWithoutVat: n(raw.salesWithoutVat),
    commission: n(raw.commission),
    bonus: n(raw.bonus),
    fine: n(raw.fine),
    payrollAdjustmentPositive: n(raw.adjustmentPositive),
    payrollAdjustmentNegative: n(raw.adjustmentNegative),
    perDiem: n(raw.perDiem),
    supplies: n(raw.supplies),
    loanPayment: n(raw.loanPayment),
    totalPayment: n(raw.totalPayment),
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    branchLines,
  };
}

function mapRun(raw: any): PayrollRun {
  const periodStart = d(raw.periodStart);
  const periodEnd = d(raw.periodEnd);
  return {
    id: raw.id,
    periodStart,
    periodEnd,
    from: periodStart,
    to: periodEnd,
    payDate: d(raw.payDate),
    mode: raw.mode,
    status: raw.status,
    salesWithVat: n(raw.salesWithVat),
    salesWithoutVat: n(raw.salesWithoutVat),
    expenseTotal: n(raw.expenseTotal),
    payrollTotal: n(raw.payrollTotal),
    generalBalance: n(raw.generalBalance),
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    lines: (raw.lines ?? []).map(mapRunLine),
  };
}

interface PayrollDataValue {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  employees: PayrollEmployee[];
  branches: PayrollBranch[];
  storageConfigured: boolean;
  catalogs: PayrollCatalogItem[];
  bonuses: PayrollCatalogItem[];
  fines: PayrollCatalogItem[];
  perDiems: PayrollCatalogItem[];
  schemes: CommissionScheme[];
  assignments: SchemeAssignment[];
  movements: PayrollMovement[];
  expenses: PayrollExpense[];
  loans: LoanAdvance[];
  runs: PayrollRunSummary[];
  selectedRun: PayrollRun | null;
  receipts: PayrollReceipt[];
  branchBreakdown: {
    branches: BranchBreakdownLine[];
    employeeLines: EmployeeBranchBreakdown[];
  };
  refreshAll: () => Promise<void>;
  selectRun: (id: string) => Promise<void>;
  saveCatalog: (
    kind: CatalogKind,
    item: { id?: string; name: string; amount: number; notes: string },
  ) => Promise<void>;
  removeCatalog: (id: string) => Promise<void>;
  saveScheme: (item: {
    id?: string;
    name: string;
    effectiveFrom: string;
    tiers: Array<{ fromAmount: number; toAmount: number | null; rate: number }>;
  }) => Promise<void>;
  removeScheme: (id: string) => Promise<void>;
  saveAssignment: (item: {
    employeeId: string;
    schemeId: string;
    effectiveFrom: string;
  }) => Promise<void>;
  removeAssignment: (id: string) => Promise<void>;
  saveMovement: (input: unknown, id?: string) => Promise<PayrollMovement>;
  setMovementStatus: (id: string, status: MovementStatus) => Promise<void>;
  uploadAttachment: (movementId: string, file: File) => Promise<void>;
  openAttachment: (id: string) => Promise<void>;
  saveExpense: (input: unknown, id?: string) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  saveLoan: (input: unknown, id?: string) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  markLoanLost: (id: string) => Promise<void>;
  createRun: (input: {
    periodStart: string;
    periodEnd: string;
    payDate: string;
    mode: PayrollCalculationMode;
  }) => Promise<void>;
  updateRun: (input: {
    payDate?: string;
    mode?: PayrollCalculationMode;
  }) => Promise<void>;
  runAction: (
    action: "recalculate" | "approve" | "pay" | "cancel",
  ) => Promise<void>;
  setReceiptStatus: (id: string, status: "SENT" | "CONFIRMED") => Promise<void>;
}

const PayrollDataContext = createContext<PayrollDataValue | null>(null);

export function PayrollDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [branches, setBranches] = useState<PayrollBranch[]>([]);
  const [storageConfigured, setStorageConfigured] = useState(false);
  const [catalogs, setCatalogs] = useState<PayrollCatalogItem[]>([]);
  const [schemes, setSchemes] = useState<CommissionScheme[]>([]);
  const [assignments, setAssignments] = useState<SchemeAssignment[]>([]);
  const [movements, setMovements] = useState<PayrollMovement[]>([]);
  const [expenses, setExpenses] = useState<PayrollExpense[]>([]);
  const [loans, setLoans] = useState<LoanAdvance[]>([]);
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [receipts, setReceipts] = useState<PayrollReceipt[]>([]);
  const [branchBreakdown, setBranchBreakdown] = useState<{
    branches: BranchBreakdownLine[];
    employeeLines: EmployeeBranchBreakdown[];
  }>({ branches: [], employeeLines: [] });

  const loadRun = useCallback(async (id: string) => {
    const [runResponse, receiptResponse, breakdownResponse] = await Promise.all(
      [
        api.get<ApiResponse<any>>(`/api/payroll/runs/${id}`),
        api.get<ApiResponse<any[]>>("/api/payroll/receipts", {
          params: { runId: id },
        }),
        api.get<ApiResponse<any>>("/api/payroll/reports/branch-breakdown", {
          params: { runId: id },
        }),
      ],
    );
    const run = mapRun(runResponse.data.data);
    setSelectedRun(run);
    setReceipts(
      receiptResponse.data.data.map((raw: any) => {
        const line = mapRunLine(raw.payrollRunLine);
        const receiptRun = mapRun(raw.payrollRunLine.payrollRun);
        return {
          id: raw.id,
          employeeName: line.employeeName,
          period: `${receiptRun.from} A ${receiptRun.to}`,
          totalPayment: line.totalPayment,
          status: raw.status,
          phone: line.phoneNumber,
          sentAt: raw.sentAt ?? null,
          confirmedAt: raw.confirmedAt ?? null,
          runLine: line,
          run: receiptRun,
        };
      }),
    );
    setBranchBreakdown({
      branches: breakdownResponse.data.data.branches.map((raw: any) => ({
        branchName: raw.branchName,
        salesWithVat: n(raw.salesWithVat),
        salesWithoutVat: n(raw.salesWithoutVat),
        payrollCost: n(raw.payrollCost),
        employeeCount: raw.employeeCount,
      })),
      employeeLines: breakdownResponse.data.data.employeeLines.map(
        (raw: any) => ({
          ...mapRunLine({ ...raw, branchLines: [raw] }).branchLines[0]!,
          employeeId: raw.employeeId,
          employeeName: raw.employeeName,
        }),
      ),
    });
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [
        bootstrap,
        catalogResponse,
        schemeResponse,
        movementResponse,
        expenseResponse,
        loanResponse,
        runResponse,
      ] = await Promise.all([
        api.get<ApiResponse<any>>("/api/payroll/bootstrap"),
        api.get<ApiResponse<any[]>>("/api/payroll/catalog-items"),
        api.get<ApiResponse<any>>("/api/payroll/schemes"),
        api.get<ApiResponse<any[]>>("/api/payroll/movements"),
        api.get<ApiResponse<any[]>>("/api/payroll/expenses"),
        api.get<ApiResponse<any[]>>("/api/payroll/loans"),
        api.get<ApiResponse<any[]>>("/api/payroll/runs"),
      ]);
      setEmployees(
        bootstrap.data.data.employees.map((raw: any) => ({
          ...raw,
          salary: raw.salary == null ? null : n(raw.salary),
        })),
      );
      setBranches(bootstrap.data.data.branches);
      setStorageConfigured(Boolean(bootstrap.data.data.storageConfigured));
      setCatalogs(catalogResponse.data.data.map(mapCatalog));
      setSchemes(schemeResponse.data.data.schemes.map(mapScheme));
      setAssignments(schemeResponse.data.data.assignments.map(mapAssignment));
      setMovements(movementResponse.data.data.map(mapMovement));
      setExpenses(expenseResponse.data.data.map(mapExpense));
      setLoans(loanResponse.data.data.map(mapLoan));
      const summaries = runResponse.data.data.map(
        (raw: any): PayrollRunSummary => ({
          ...mapRun(raw),
          lineCount: raw._count?.lines ?? 0,
        }),
      );
      setRuns(summaries);
      const preferredId =
        selectedRun?.id &&
        summaries.some((run: PayrollRunSummary) => run.id === selectedRun.id)
          ? selectedRun.id
          : (summaries.find(
              (run: PayrollRunSummary) => run.status !== "CANCELED",
            )?.id ?? summaries[0]?.id);
      if (preferredId) await loadRun(preferredId);
      else {
        setSelectedRun(null);
        setReceipts([]);
        setBranchBreakdown({ branches: [], employeeLines: [] });
      }
    } catch (cause) {
      setError(
        apiErrorMessage(cause, "No se pudieron cargar los datos de nómina."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadRun, selectedRun?.id]);

  useEffect(() => {
    void refreshAll();
  }, []);

  const selectRun = useCallback(
    async (id: string) => {
      setRefreshing(true);
      try {
        await loadRun(id);
      } finally {
        setRefreshing(false);
      }
    },
    [loadRun],
  );

  const reload = useCallback(
    async (operation: () => Promise<unknown>) => {
      await operation();
      await refreshAll();
    },
    [refreshAll],
  );

  const value = useMemo<PayrollDataValue>(
    () => ({
      loading,
      refreshing,
      error,
      employees,
      branches,
      storageConfigured,
      catalogs,
      bonuses: catalogs.filter((item) => item.kind === "BONUS" && item.active),
      fines: catalogs.filter((item) => item.kind === "FINE" && item.active),
      perDiems: catalogs.filter(
        (item) => item.kind === "PER_DIEM" && item.active,
      ),
      schemes,
      assignments,
      movements,
      expenses,
      loans,
      runs,
      selectedRun,
      receipts,
      branchBreakdown,
      refreshAll,
      selectRun,
      saveCatalog: async (kind, item) =>
        reload(() =>
          item.id
            ? api.put(`/api/payroll/catalog-items/${item.id}`, {
                kind,
                name: item.name,
                defaultAmount: item.amount,
                notes: item.notes,
              })
            : api.post("/api/payroll/catalog-items", {
                kind,
                name: item.name,
                defaultAmount: item.amount,
                notes: item.notes,
              }),
        ),
      removeCatalog: async (id) =>
        reload(() => api.delete(`/api/payroll/catalog-items/${id}`)),
      saveScheme: async (item) =>
        reload(() =>
          item.id
            ? api.put(`/api/payroll/schemes/${item.id}`, item)
            : api.post("/api/payroll/schemes", item),
        ),
      removeScheme: async (id) =>
        reload(() => api.delete(`/api/payroll/schemes/${id}`)),
      saveAssignment: async (item) =>
        reload(() => api.post("/api/payroll/assignments", item)),
      removeAssignment: async (id) =>
        reload(() => api.delete(`/api/payroll/assignments/${id}`)),
      saveMovement: async (input, id) => {
        const response = id
          ? await api.put<ApiResponse<any>>(
              `/api/payroll/movements/${id}`,
              input,
            )
          : await api.post<ApiResponse<any>>("/api/payroll/movements", input);
        await refreshAll();
        return mapMovement(response.data.data);
      },
      setMovementStatus: async (id, status) =>
        reload(() =>
          api.patch(`/api/payroll/movements/${id}/status`, { status }),
        ),
      uploadAttachment: async (movementId, file) => {
        const form = new FormData();
        form.append("file", file);
        await reload(() =>
          api.post(`/api/payroll/movements/${movementId}/attachments`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          }),
        );
      },
      openAttachment: async (id) => {
        const response = await api.get<ApiResponse<{ url: string }>>(
          `/api/payroll/attachments/${id}/url`,
        );
        window.open(response.data.data.url, "_blank", "noopener,noreferrer");
      },
      saveExpense: async (input, id) =>
        reload(() =>
          id
            ? api.put(`/api/payroll/expenses/${id}`, input)
            : api.post("/api/payroll/expenses", input),
        ),
      removeExpense: async (id) =>
        reload(() => api.delete(`/api/payroll/expenses/${id}`)),
      saveLoan: async (input, id) =>
        reload(() =>
          id
            ? api.put(`/api/payroll/loans/${id}`, input)
            : api.post("/api/payroll/loans", input),
        ),
      removeLoan: async (id) =>
        reload(() => api.delete(`/api/payroll/loans/${id}`)),
      markLoanLost: async (id) =>
        reload(() =>
          api.patch(`/api/payroll/loans/${id}/status`, { status: "LOST" }),
        ),
      createRun: async (input) => {
        const response = await api.post<ApiResponse<any>>(
          "/api/payroll/runs",
          input,
          { timeout: PAYROLL_CALCULATION_TIMEOUT_MS },
        );
        await refreshAll();
        await loadRun(response.data.data.id);
      },
      updateRun: async (input) => {
        if (!selectedRun) throw new Error("Selecciona una corrida.");
        await reload(() =>
          api.put(`/api/payroll/runs/${selectedRun.id}`, input, {
            timeout: PAYROLL_CALCULATION_TIMEOUT_MS,
          }),
        );
      },
      runAction: async (action) => {
        if (!selectedRun) throw new Error("Selecciona una corrida.");
        await reload(() =>
          api.post(
            `/api/payroll/runs/${selectedRun.id}/${action}`,
            undefined,
            action === "recalculate"
              ? { timeout: PAYROLL_CALCULATION_TIMEOUT_MS }
              : undefined,
          ),
        );
      },
      setReceiptStatus: async (id, status) =>
        reload(() =>
          api.patch(`/api/payroll/receipts/${id}/status`, { status }),
        ),
    }),
    [
      assignments,
      branchBreakdown,
      branches,
      catalogs,
      employees,
      error,
      expenses,
      loadRun,
      loans,
      loading,
      movements,
      receipts,
      refreshAll,
      refreshing,
      reload,
      runs,
      schemes,
      selectRun,
      selectedRun,
      storageConfigured,
    ],
  );

  return (
    <PayrollDataContext.Provider value={value}>
      {children}
    </PayrollDataContext.Provider>
  );
}

export function usePayrollData() {
  const value = useContext(PayrollDataContext);
  if (!value)
    throw new Error(
      "usePayrollData debe usarse dentro de PayrollDataProvider.",
    );
  return value;
}

export type { CatalogKind, MovementKind };
