import { sumBy } from './format'

export type PayrollStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID'
export type MovementStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type MovementKind = 'BONUS' | 'ADJUSTMENT_POSITIVE' | 'ADJUSTMENT_NEGATIVE' | 'FINE' | 'PER_DIEM' | 'SUPPLIES'
export type LoanStatus = 'PENDING' | 'PAID' | 'LOST'
export type ReceiptStatus = 'GENERATED' | 'SENT' | 'CONFIRMED'

export interface PayrollEmployee {
  id: string
  name: string
  position: string
  branch: string
  bank: string
  account: string
  salary: number
  active: boolean
}

export interface PayrollRunLine {
  employeeId: string
  employeeName: string
  position: string
  branch: string
  salesWithVat: number
  salesWithoutVat: number
  scheme: string
  individualRate: number
  commission: number
  bonus: number
  fine: number
  salaryBase: number
  loanBalance: number
  loanPayment: number
  payrollAdjustmentPositive: number
  payrollAdjustmentNegative: number
  perDiem: number
  totalPayment: number
}

export interface PayrollRun {
  id: string
  label: string
  from: string
  to: string
  payDate: string
  mode: 'WITH_VAT' | 'WITHOUT_VAT'
  status: PayrollStatus
  lines: PayrollRunLine[]
}

export interface PayrollMovement {
  id: string
  date: string
  employeeName: string
  branch: string
  kind: MovementKind
  concept: string
  amount: number
  status: MovementStatus
  notes: string
  sharedWith: number
  attachmentRequired: boolean
  commissionable: boolean
}

export interface CommissionTier {
  from: number
  to: number
  rate: number
}

export interface CommissionScheme {
  id: string
  name: string
  role: string
  flatRate: number
  bonusRule: string
  activeEmployees: number
  effectiveFrom: string
  effectiveTo: string | null
  tiers: CommissionTier[]
}

export interface LoanAdvance {
  id: string
  requestedAt: string
  employeeName: string
  nature: 'Prestamo' | 'Adelanto de nomina'
  requestedAmount: number
  payments: number
  paymentAmount: number
  paidAmount: number
  balance: number
  status: LoanStatus
  nextPeriod: string
}

export interface BranchBreakdown {
  branch: string
  sales: number
  commissions: number
  bonus: number
  salary: number
  adjustments: number
  totalCost: number
  payrollWeight: number
}

export interface PayrollReceipt {
  id: string
  employeeName: string
  period: string
  totalPayment: number
  status: ReceiptStatus
  sentTo: string
  confirmedAt: string | null
}

export const employees: PayrollEmployee[] = [
  { id: 'emp-01', name: 'Natalia Mendez Sarmiento', position: 'GERENTE', branch: 'MITIKAH', bank: 'BBVA', account: '**** 7291', salary: 17500, active: true },
  { id: 'emp-02', name: 'Orlando Jose Saavedra Diaz', position: 'CERRADOR', branch: 'MITIKAH', bank: 'Santander', account: '**** 2248', salary: 0, active: true },
  { id: 'emp-03', name: 'Daniel Molina', position: 'VENDEDOR', branch: 'OPATRA', bank: 'Banorte', account: '**** 1180', salary: 0, active: true },
  { id: 'emp-04', name: 'Carlos Francisco Martinez Ayala', position: 'GERENTE', branch: 'OPATRA', bank: 'HSBC', account: '**** 8841', salary: 0, active: true },
  { id: 'emp-05', name: 'Andrea Stephani Rada Castillo', position: 'GERENTE', branch: 'CARRETA INSURGENTES', bank: 'BBVA', account: '**** 6144', salary: 0, active: true },
  { id: 'emp-06', name: 'Maria Magdalena Cruz Rosales', position: 'VENDEDOR', branch: 'GALERIAS INSURGENTES', bank: 'Banamex', account: '**** 3562', salary: 0, active: true },
  { id: 'emp-07', name: 'Blanca Elizabeth Garcia Padilla', position: 'FACIALISTA', branch: 'OPATRA', bank: 'BBVA', account: '**** 9070', salary: 0, active: true },
  { id: 'emp-08', name: 'Manuel Ortega Gutierrez', position: 'CALL CENTER', branch: 'REMOTO', bank: 'Santander', account: '**** 5106', salary: 0, active: true },
]

export const currentRun: PayrollRun = {
  id: 'run-2025-06-01',
  label: '1a quincena junio 2025',
  from: '2025-06-01',
  to: '2025-06-15',
  payDate: '2025-06-22',
  mode: 'WITH_VAT',
  status: 'CALCULATED',
  lines: [
    { employeeId: 'emp-01', employeeName: 'Natalia Mendez Sarmiento', position: 'GERENTE', branch: 'MITIKAH', salesWithVat: 99450, salesWithoutVat: 85733, scheme: 'GERENTE 32%', individualRate: 0.32, commission: 31824, bonus: 3600, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 35424 },
    { employeeId: 'emp-02', employeeName: 'Orlando Jose Saavedra Diaz', position: 'CERRADOR', branch: 'MITIKAH', salesWithVat: 55450, salesWithoutVat: 47802, scheme: 'CERRADOR A', individualRate: 0.32, commission: 17744, bonus: 5300, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 23044 },
    { employeeId: 'emp-03', employeeName: 'Daniel Molina', position: 'VENDEDOR', branch: 'OPATRA', salesWithVat: 61050, salesWithoutVat: 52629, scheme: 'VENDEDOR 30%', individualRate: 0.3, commission: 18315, bonus: 5550, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 23865 },
    { employeeId: 'emp-04', employeeName: 'Carlos Francisco Martinez Ayala', position: 'GERENTE', branch: 'OPATRA', salesWithVat: 171563, salesWithoutVat: 147899, scheme: 'GERENTE OPATRA', individualRate: 0.3, commission: 51469, bonus: 9500, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 3510, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 64479 },
    { employeeId: 'emp-05', employeeName: 'Andrea Stephani Rada Castillo', position: 'GERENTE', branch: 'CARRETA INSURGENTES', salesWithVat: 12350, salesWithoutVat: 10647, scheme: 'GERENTE INSURGENTES', individualRate: 0.3, commission: 3705, bonus: 3750, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 5000, payrollAdjustmentPositive: 490, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 2945 },
    { employeeId: 'emp-06', employeeName: 'Maria Magdalena Cruz Rosales', position: 'VENDEDOR', branch: 'GALERIAS INSURGENTES', salesWithVat: 41967, salesWithoutVat: 36178, scheme: 'VENDEDOR 24%', individualRate: 0.24, commission: 10072, bonus: 200, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 10272 },
    { employeeId: 'emp-07', employeeName: 'Blanca Elizabeth Garcia Padilla', position: 'FACIALISTA', branch: 'OPATRA', salesWithVat: 0, salesWithoutVat: 0, scheme: 'FACIALISTA', individualRate: 0, commission: 0, bonus: 10950, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 380, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 11330 },
    { employeeId: 'emp-08', employeeName: 'Manuel Ortega Gutierrez', position: 'CALL CENTER', branch: 'REMOTO', salesWithVat: 0, salesWithoutVat: 0, scheme: 'CALL CENTER', individualRate: 0, commission: 0, bonus: 2750, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 2750 },
  ],
}

export const movements: PayrollMovement[] = [
  { id: 'mov-01', date: '2025-06-01', employeeName: 'Natalia Mendez Sarmiento', branch: 'MITIKAH', kind: 'BONUS', concept: 'HIT', amount: 200, status: 'APPROVED', notes: 'Bono por venta individual', sharedWith: 1, attachmentRequired: false, commissionable: true },
  { id: 'mov-02', date: '2025-06-04', employeeName: 'Alejandra Ivonne Gomez Flores', branch: 'GALERIAS INSURGENTES', kind: 'BONUS', concept: 'FULL HOUSE', amount: 150, status: 'PENDING', notes: 'Bono compartido 50/50', sharedWith: 2, attachmentRequired: false, commissionable: true },
  { id: 'mov-03', date: '2025-06-04', employeeName: 'Jesus Ramiro Navarro Carrillo', branch: 'GALERIAS INSURGENTES', kind: 'BONUS', concept: 'FULL HOUSE', amount: 150, status: 'PENDING', notes: 'Bono compartido 50/50', sharedWith: 2, attachmentRequired: false, commissionable: true },
  { id: 'mov-04', date: '2025-06-03', employeeName: 'Edgar Herrera Herrera Espinoza', branch: 'GALERIAS INSURGENTES', kind: 'PER_DIEM', concept: 'VIATICOS', amount: 700, status: 'APPROVED', notes: 'Requiere comprobante', sharedWith: 1, attachmentRequired: true, commissionable: false },
  { id: 'mov-05', date: '2025-06-05', employeeName: 'Andrea Stephani Rada Castillo', branch: 'OPATRA', kind: 'FINE', concept: 'MULTA', amount: -300, status: 'REJECTED', notes: 'Rechazada por administracion', sharedWith: 1, attachmentRequired: false, commissionable: false },
  { id: 'mov-06', date: '2025-06-06', employeeName: 'Daniel Molina', branch: 'OPATRA', kind: 'SUPPLIES', concept: 'INSUMOS', amount: 460, status: 'PENDING', notes: 'Pendiente de factura', sharedWith: 1, attachmentRequired: true, commissionable: false },
]

export const schemes: CommissionScheme[] = [
  { id: 'scheme-01', name: 'GERENTE 32%', role: 'GERENTE', flatRate: 0.32, bonusRule: '1% + 600,000 / 4% record', activeEmployees: 3, effectiveFrom: '2025-06-01', effectiveTo: null, tiers: [{ from: 1, to: 599999, rate: 0.32 }, { from: 600000, to: 999999, rate: 0.35 }] },
  { id: 'scheme-02', name: 'VENDEDOR 30%', role: 'VENDEDOR', flatRate: 0.3, bonusRule: '30% flat', activeEmployees: 8, effectiveFrom: '2025-06-01', effectiveTo: null, tiers: [{ from: 1, to: 999999, rate: 0.3 }] },
  { id: 'scheme-03', name: 'CERRADOR A', role: 'CERRADOR', flatRate: 0.28, bonusRule: 'Variable por rango', activeEmployees: 4, effectiveFrom: '2025-05-16', effectiveTo: null, tiers: [{ from: 1, to: 59999, rate: 0.24 }, { from: 60000, to: 119999, rate: 0.26 }, { from: 120000, to: 999999, rate: 0.28 }] },
  { id: 'scheme-04', name: 'FACIALISTA', role: 'FACIALISTA', flatRate: 0.24, bonusRule: 'Bono por servicio', activeEmployees: 5, effectiveFrom: '2025-05-01', effectiveTo: null, tiers: [{ from: 1, to: 79999, rate: 0.24 }, { from: 80000, to: 149999, rate: 0.26 }, { from: 150000, to: 999999, rate: 0.28 }] },
]

export const loans: LoanAdvance[] = [
  { id: 'loan-01', requestedAt: '2025-05-12', employeeName: 'Andrea Stephani Rada Castillo', nature: 'Prestamo', requestedAmount: 5000, payments: 5, paymentAmount: 1000, paidAmount: 2000, balance: 3000, status: 'PENDING', nextPeriod: '2025-06-16 a 2025-06-30' },
  { id: 'loan-02', requestedAt: '2025-05-28', employeeName: 'Orlando Jose Saavedra Diaz', nature: 'Adelanto de nomina', requestedAmount: 1500, payments: 3, paymentAmount: 500, paidAmount: 1500, balance: 0, status: 'PAID', nextPeriod: 'Liquidado' },
  { id: 'loan-03', requestedAt: '2025-04-03', employeeName: 'Empleado inactivo historico', nature: 'Prestamo', requestedAmount: 3000, payments: 3, paymentAmount: 1000, paidAmount: 1000, balance: 2000, status: 'LOST', nextPeriod: 'Ajuste manual' },
]

export const branchBreakdown: BranchBreakdown[] = [
  { branch: 'MITIKAH', sales: 147200, commissions: 49568, bonus: 8900, salary: 0, adjustments: 0, totalCost: 58468, payrollWeight: 0.29 },
  { branch: 'OPATRA', sales: 232613, commissions: 69784, bonus: 28750, salary: 0, adjustments: 4350, totalCost: 102884, payrollWeight: 0.51 },
  { branch: 'GALERIAS INSURGENTES', sales: 41967, commissions: 10072, bonus: 3200, salary: 0, adjustments: 0, totalCost: 13272, payrollWeight: 0.07 },
  { branch: 'CARRETA INSURGENTES', sales: 12350, commissions: 3705, bonus: 3750, salary: 0, adjustments: -4510, totalCost: 2945, payrollWeight: 0.02 },
  { branch: 'REMOTO', sales: 0, commissions: 0, bonus: 2750, salary: 0, adjustments: 0, totalCost: 2750, payrollWeight: 0.01 },
]

export const receipts: PayrollReceipt[] = currentRun.lines.map((line, index) => ({
  id: `receipt-${line.employeeId}`,
  employeeName: line.employeeName,
  period: currentRun.label,
  totalPayment: line.totalPayment,
  status: index < 3 ? 'CONFIRMED' : index < 6 ? 'SENT' : 'GENERATED',
  sentTo: employees.find((employee) => employee.id === line.employeeId)?.account ?? 'WhatsApp pendiente',
  confirmedAt: index < 3 ? `2025-06-${22 + index}` : null,
}))

export const payrollTotals = {
  salesWithVat: sumBy(currentRun.lines, (line) => line.salesWithVat),
  salesWithoutVat: sumBy(currentRun.lines, (line) => line.salesWithoutVat),
  commissions: sumBy(currentRun.lines, (line) => line.commission),
  bonuses: sumBy(currentRun.lines, (line) => line.bonus),
  loanPayments: sumBy(currentRun.lines, (line) => line.loanPayment),
  totalPayment: sumBy(currentRun.lines, (line) => line.totalPayment),
}
