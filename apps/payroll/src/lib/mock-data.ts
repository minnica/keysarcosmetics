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

export interface PayrollBonus {
  id: string
  name: string
  amount: number
  notes: string
}

export interface PayrollCatalogItem {
  id: string
  name: string
  amount: number
  notes: string
}

export type ExpenseKind = 'FIXED' | 'VARIABLE'
export type ExpenseFrequency = 'ONE_TIME' | 'BIWEEKLY' | 'MONTHLY'

export interface PayrollExpense {
  id: string
  date: string
  kind: ExpenseKind
  concept: string
  category: string
  branch: string
  amount: number
  frequency: ExpenseFrequency
  notes: string
}

export interface CommissionRange {
  from: number
  to: number
  rate: number
}

export interface CommissionScheme {
  id: string
  name: string
  ranges: CommissionRange[]
}

export interface SchemeAssignment {
  id: string
  employeeId: string
  schemeId: string
  assignedAt: string
}

export interface LoanAdvance {
  id: string
  requestedAt: string
  employeeName: string
  nature: 'PRESTAMO' | 'ADELANTO DE NOMINA'
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

export interface PayrollBreakdownLine {
  employeeId: string
  employeeName: string
  totalSales: number
  deltaSales: number
  galeriasInsurgentesSales: number
  masarykSales: number
  mitikahSales: number
  mitikahVipSales: number
  opatraSales: number
  rate: number
  commission: number
  bonus: number
  fine: number
  loanPayment: number
  payrollAdjustmentPositive: number
  payrollAdjustmentNegative: number
  totalPayment: number
  deltaCost: number
  galeriasInsurgentesCost: number
  masarykCost: number
  mitikahCost: number
  mitikahVipCost: number
  opatraCost: number
  perDiem: number
  totalCost: number
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
  { id: 'emp-02', name: 'Orlando Jose Saavedra Diaz', position: 'CERRADOR', branch: 'MITIKAH VIP', bank: 'Santander', account: '**** 2248', salary: 0, active: true },
  { id: 'emp-03', name: 'Daniel Molina', position: 'VENDEDOR', branch: 'OPATRA', bank: 'Banorte', account: '**** 1180', salary: 0, active: true },
  { id: 'emp-04', name: 'Carlos Francisco Martinez Ayala', position: 'GERENTE', branch: 'OPATRA', bank: 'HSBC', account: '**** 8841', salary: 0, active: true },
  { id: 'emp-05', name: 'Andrea Stephani Rada Castillo', position: 'GERENTE', branch: 'DELTA', bank: 'BBVA', account: '**** 6144', salary: 0, active: true },
  { id: 'emp-06', name: 'Maria Magdalena Cruz Rosales', position: 'VENDEDOR', branch: 'GALERIAS INSURGENTES', bank: 'Banamex', account: '**** 3562', salary: 0, active: true },
  { id: 'emp-07', name: 'Blanca Elizabeth Garcia Padilla', position: 'FACIALISTA', branch: 'OPATRA', bank: 'BBVA', account: '**** 9070', salary: 0, active: true },
  { id: 'emp-08', name: 'Manuel Ortega Gutierrez', position: 'CALL CENTER', branch: 'MASARYK', bank: 'Santander', account: '**** 5106', salary: 0, active: true },
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
    { employeeId: 'emp-01', employeeName: 'Natalia Mendez Sarmiento', position: 'GERENTE', branch: 'MITIKAH', salesWithVat: 99450, salesWithoutVat: 85733, scheme: '1', individualRate: 0.32, commission: 31824, bonus: 3600, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 35424 },
    { employeeId: 'emp-02', employeeName: 'Orlando Jose Saavedra Diaz', position: 'CERRADOR', branch: 'MITIKAH VIP', salesWithVat: 55450, salesWithoutVat: 47802, scheme: '4', individualRate: 0.32, commission: 17744, bonus: 5300, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 23044 },
    { employeeId: 'emp-03', employeeName: 'Daniel Molina', position: 'VENDEDOR', branch: 'OPATRA', salesWithVat: 61050, salesWithoutVat: 52629, scheme: '3', individualRate: 0.3, commission: 18315, bonus: 5550, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 23865 },
    { employeeId: 'emp-04', employeeName: 'Carlos Francisco Martinez Ayala', position: 'GERENTE', branch: 'OPATRA', salesWithVat: 171563, salesWithoutVat: 147899, scheme: '2', individualRate: 0.3, commission: 51469, bonus: 9500, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 3510, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 64479 },
    { employeeId: 'emp-05', employeeName: 'Andrea Stephani Rada Castillo', position: 'GERENTE', branch: 'DELTA', salesWithVat: 12350, salesWithoutVat: 10647, scheme: '2', individualRate: 0.3, commission: 3705, bonus: 3750, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 5000, payrollAdjustmentPositive: 490, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 2945 },
    { employeeId: 'emp-06', employeeName: 'Maria Magdalena Cruz Rosales', position: 'VENDEDOR', branch: 'GALERIAS INSURGENTES', salesWithVat: 41967, salesWithoutVat: 36178, scheme: '3', individualRate: 0.24, commission: 10072, bonus: 200, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 10272 },
    { employeeId: 'emp-07', employeeName: 'Blanca Elizabeth Garcia Padilla', position: 'FACIALISTA', branch: 'OPATRA', salesWithVat: 0, salesWithoutVat: 0, scheme: '5', individualRate: 0, commission: 0, bonus: 10950, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 380, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 11330 },
    { employeeId: 'emp-08', employeeName: 'Manuel Ortega Gutierrez', position: 'CALL CENTER', branch: 'MASARYK', salesWithVat: 0, salesWithoutVat: 0, scheme: '3', individualRate: 0, commission: 0, bonus: 2750, fine: 0, salaryBase: 0, loanBalance: 0, loanPayment: 0, payrollAdjustmentPositive: 0, payrollAdjustmentNegative: 0, perDiem: 0, totalPayment: 2750 },
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

export const bonusTemplates: PayrollBonus[] = [
  { id: 'bonus-01', name: 'HIT', amount: 200, notes: 'Bono por venta individual' },
  { id: 'bonus-02', name: 'FULL HOUSE', amount: 150, notes: 'Bono compartido 50/50' },
  { id: 'bonus-03', name: 'BONO STAR', amount: 350, notes: 'Bono premium por cierre destacado' },
  { id: 'bonus-04', name: 'BONO GRUPO', amount: 500, notes: 'Bono grupal por meta de equipo' },
]

export const fineTemplates: PayrollCatalogItem[] = [
  { id: 'fine-01', name: 'RETARDO', amount: 150, notes: 'Descuento por llegada fuera del horario autorizado' },
  { id: 'fine-02', name: 'FALTA INJUSTIFICADA', amount: 500, notes: 'Descuento sujeto a revisión administrativa' },
  { id: 'fine-03', name: 'INCUMPLIMIENTO OPERATIVO', amount: 300, notes: 'Incumplimiento documentado de proceso interno' },
]

export const perDiemTemplates: PayrollCatalogItem[] = [
  { id: 'per-diem-01', name: 'TRASLADO LOCAL', amount: 350, notes: 'Apoyo de transporte dentro de la ciudad' },
  { id: 'per-diem-02', name: 'ALIMENTOS', amount: 500, notes: 'Apoyo de alimentos por jornada extendida' },
  { id: 'per-diem-03', name: 'VIÁTICO FORÁNEO', amount: 1200, notes: 'Traslado y alimentos fuera de la zona habitual' },
]

export const initialExpenses: PayrollExpense[] = [
  { id: 'expense-01', date: '2025-06-01', kind: 'FIXED', concept: 'Renta de oficinas', category: 'Renta', branch: 'CORPORATIVO', amount: 18500, frequency: 'MONTHLY', notes: 'Proporción mock del periodo activo' },
  { id: 'expense-02', date: '2025-06-06', kind: 'VARIABLE', concept: 'Mensajería operativa', category: 'Logística', branch: 'MITIKAH', amount: 1450, frequency: 'ONE_TIME', notes: 'Envíos y recolecciones del periodo' },
]

export const schemes: CommissionScheme[] = [
  { id: 'scheme-01', name: '1', ranges: [{ from: 1, to: 599999.99, rate: 0.34 }, { from: 600000, to: 999999.99, rate: 0.35 }] },
  { id: 'scheme-02', name: '2', ranges: [{ from: 1, to: 59999.99, rate: 0.25 }, { from: 60000, to: 119999.99, rate: 0.27 }, { from: 120000, to: 999999.99, rate: 0.28 }] },
  { id: 'scheme-03', name: '3', ranges: [{ from: 1, to: 79999.99, rate: 0.3 }, { from: 80000, to: 999999.99, rate: 0.32 }] },
  { id: 'scheme-04', name: '4', ranges: [{ from: 1, to: 39999.99, rate: 0.28 }, { from: 40000, to: 999999.99, rate: 0.3 }] },
  { id: 'scheme-05', name: '5', ranges: [{ from: 1, to: 59999.99, rate: 0.27 }, { from: 60000, to: 999999.99, rate: 0.28 }] },
]

export const schemeAssignments: SchemeAssignment[] = [
  { id: 'assign-01', employeeId: 'emp-01', schemeId: 'scheme-01', assignedAt: '2025-06-01' },
  { id: 'assign-02', employeeId: 'emp-02', schemeId: 'scheme-04', assignedAt: '2025-06-01' },
  { id: 'assign-03', employeeId: 'emp-03', schemeId: 'scheme-03', assignedAt: '2025-06-02' },
  { id: 'assign-04', employeeId: 'emp-04', schemeId: 'scheme-02', assignedAt: '2025-06-03' },
  { id: 'assign-05', employeeId: 'emp-05', schemeId: 'scheme-02', assignedAt: '2025-06-03' },
  { id: 'assign-06', employeeId: 'emp-06', schemeId: 'scheme-03', assignedAt: '2025-06-04' },
  { id: 'assign-07', employeeId: 'emp-07', schemeId: 'scheme-05', assignedAt: '2025-06-04' },
  { id: 'assign-08', employeeId: 'emp-08', schemeId: 'scheme-03', assignedAt: '2025-06-05' },
]

export const loans: LoanAdvance[] = [
  { id: 'loan-01', requestedAt: '2025-05-12', employeeName: 'Andrea Stephani Rada Castillo', nature: 'PRESTAMO', requestedAmount: 5000, payments: 5, paymentAmount: 1000, paidAmount: 2000, balance: 3000, status: 'PENDING', nextPeriod: '2025-06-16 A 2025-06-30' },
  { id: 'loan-02', requestedAt: '2025-05-28', employeeName: 'Orlando Jose Saavedra Diaz', nature: 'ADELANTO DE NOMINA', requestedAmount: 1500, payments: 3, paymentAmount: 500, paidAmount: 1500, balance: 0, status: 'PAID', nextPeriod: 'LIQUIDADO' },
  { id: 'loan-03', requestedAt: '2025-04-03', employeeName: 'Empleado inactivo historico', nature: 'PRESTAMO', requestedAmount: 3000, payments: 3, paymentAmount: 1000, paidAmount: 1000, balance: 2000, status: 'LOST', nextPeriod: 'AJUSTE MANUAL' },
]

export const branchBreakdown: BranchBreakdown[] = [
  { branch: 'DELTA', sales: 15800, commissions: 4740, bonus: 3750, salary: 0, adjustments: -4510, totalCost: 3980, payrollWeight: 0.02 },
  { branch: 'GALERIAS INSURGENTES', sales: 42167, commissions: 10132, bonus: 200, salary: 0, adjustments: 500, totalCost: 10832, payrollWeight: 0.06 },
  { branch: 'MASARYK', sales: 0, commissions: 0, bonus: 2750, salary: 0, adjustments: 0, totalCost: 2750, payrollWeight: 0.02 },
  { branch: 'MITIKAH', sales: 121600, commissions: 38931, bonus: 3600, salary: 0, adjustments: 3038, totalCost: 45569, payrollWeight: 0.26 },
  { branch: 'MITIKAH VIP', sales: 55450, commissions: 17744, bonus: 5300, salary: 0, adjustments: 0, totalCost: 23044, payrollWeight: 0.13 },
  { branch: 'OPATRA', sales: 206813, commissions: 62016, bonus: 20450, salary: 0, adjustments: 5468, totalCost: 87934, payrollWeight: 0.51 },
]

export const payrollBreakdownLines: PayrollBreakdownLine[] = [
  {
    employeeId: 'emp-01',
    employeeName: 'Natalia Mendez Sarmiento',
    totalSales: 99450,
    deltaSales: 0,
    galeriasInsurgentesSales: 0,
    masarykSales: 0,
    mitikahSales: 99450,
    mitikahVipSales: 0,
    opatraSales: 0,
    rate: 0.32,
    commission: 31824,
    bonus: 3600,
    fine: 0,
    loanPayment: 0,
    payrollAdjustmentPositive: 0,
    payrollAdjustmentNegative: 0,
    totalPayment: 35424,
    deltaCost: 0,
    galeriasInsurgentesCost: 0,
    masarykCost: 0,
    mitikahCost: 35424,
    mitikahVipCost: 0,
    opatraCost: 0,
    perDiem: 0,
    totalCost: 35424,
  },
  {
    employeeId: 'emp-02',
    employeeName: 'Orlando Jose Saavedra Diaz',
    totalSales: 55450,
    deltaSales: 0,
    galeriasInsurgentesSales: 0,
    masarykSales: 0,
    mitikahSales: 0,
    mitikahVipSales: 55450,
    opatraSales: 0,
    rate: 0.32,
    commission: 17744,
    bonus: 5300,
    fine: 0,
    loanPayment: 0,
    payrollAdjustmentPositive: 0,
    payrollAdjustmentNegative: 0,
    totalPayment: 23044,
    deltaCost: 0,
    galeriasInsurgentesCost: 0,
    masarykCost: 0,
    mitikahCost: 0,
    mitikahVipCost: 23044,
    opatraCost: 0,
    perDiem: 0,
    totalCost: 23044,
  },
  {
    employeeId: 'emp-03',
    employeeName: 'Daniel Molina',
    totalSales: 61050,
    deltaSales: 3450,
    galeriasInsurgentesSales: 200,
    masarykSales: 0,
    mitikahSales: 22150,
    mitikahVipSales: 0,
    opatraSales: 35250,
    rate: 0.3,
    commission: 18315,
    bonus: 5550,
    fine: 0,
    loanPayment: 0,
    payrollAdjustmentPositive: 0,
    payrollAdjustmentNegative: 0,
    totalPayment: 23865,
    deltaCost: 1035,
    galeriasInsurgentesCost: 560,
    masarykCost: 0,
    mitikahCost: 10145,
    mitikahVipCost: 0,
    opatraCost: 12125,
    perDiem: 0,
    totalCost: 23865,
  },
  {
    employeeId: 'emp-04',
    employeeName: 'Carlos Francisco Martinez Ayala',
    totalSales: 171563,
    deltaSales: 0,
    galeriasInsurgentesSales: 0,
    masarykSales: 0,
    mitikahSales: 0,
    mitikahVipSales: 0,
    opatraSales: 171563,
    rate: 0.3,
    commission: 51469,
    bonus: 9500,
    fine: 0,
    loanPayment: 0,
    payrollAdjustmentPositive: 3510,
    payrollAdjustmentNegative: 0,
    totalPayment: 64479,
    deltaCost: 0,
    galeriasInsurgentesCost: 0,
    masarykCost: 0,
    mitikahCost: 0,
    mitikahVipCost: 0,
    opatraCost: 64479,
    perDiem: 0,
    totalCost: 64479,
  },
  {
    employeeId: 'emp-05',
    employeeName: 'Andrea Stephani Rada Castillo',
    totalSales: 12350,
    deltaSales: 12350,
    galeriasInsurgentesSales: 0,
    masarykSales: 0,
    mitikahSales: 0,
    mitikahVipSales: 0,
    opatraSales: 0,
    rate: 0.3,
    commission: 3705,
    bonus: 3750,
    fine: 0,
    loanPayment: 5000,
    payrollAdjustmentPositive: 490,
    payrollAdjustmentNegative: 0,
    totalPayment: 2945,
    deltaCost: 2945,
    galeriasInsurgentesCost: 0,
    masarykCost: 0,
    mitikahCost: 0,
    mitikahVipCost: 0,
    opatraCost: 0,
    perDiem: 0,
    totalCost: 2945,
  },
  {
    employeeId: 'emp-06',
    employeeName: 'Maria Magdalena Cruz Rosales',
    totalSales: 41967,
    deltaSales: 0,
    galeriasInsurgentesSales: 41967,
    masarykSales: 0,
    mitikahSales: 0,
    mitikahVipSales: 0,
    opatraSales: 0,
    rate: 0.24,
    commission: 10072,
    bonus: 200,
    fine: 0,
    loanPayment: 0,
    payrollAdjustmentPositive: 0,
    payrollAdjustmentNegative: 0,
    totalPayment: 10272,
    deltaCost: 0,
    galeriasInsurgentesCost: 10272,
    masarykCost: 0,
    mitikahCost: 0,
    mitikahVipCost: 0,
    opatraCost: 0,
    perDiem: 0,
    totalCost: 10272,
  },
  {
    employeeId: 'emp-07',
    employeeName: 'Blanca Elizabeth Garcia Padilla',
    totalSales: 0,
    deltaSales: 0,
    galeriasInsurgentesSales: 0,
    masarykSales: 0,
    mitikahSales: 0,
    mitikahVipSales: 0,
    opatraSales: 0,
    rate: 0,
    commission: 0,
    bonus: 10950,
    fine: 0,
    loanPayment: 0,
    payrollAdjustmentPositive: 380,
    payrollAdjustmentNegative: 0,
    totalPayment: 11330,
    deltaCost: 0,
    galeriasInsurgentesCost: 0,
    masarykCost: 0,
    mitikahCost: 0,
    mitikahVipCost: 0,
    opatraCost: 11330,
    perDiem: 0,
    totalCost: 11330,
  },
  {
    employeeId: 'emp-08',
    employeeName: 'Manuel Ortega Gutierrez',
    totalSales: 0,
    deltaSales: 0,
    galeriasInsurgentesSales: 0,
    masarykSales: 0,
    mitikahSales: 0,
    mitikahVipSales: 0,
    opatraSales: 0,
    rate: 0,
    commission: 0,
    bonus: 2750,
    fine: 0,
    loanPayment: 0,
    payrollAdjustmentPositive: 0,
    payrollAdjustmentNegative: 0,
    totalPayment: 2750,
    deltaCost: 0,
    galeriasInsurgentesCost: 0,
    masarykCost: 2750,
    mitikahCost: 0,
    mitikahVipCost: 0,
    opatraCost: 0,
    perDiem: 0,
    totalCost: 2750,
  },
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
