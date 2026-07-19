import type { ScreenKey } from '@cosmetics/types'

export type AccessSection = 'forms' | 'reports' | 'admin'
export type SidebarLabelKey =
  | 'forms'
  | 'reports'
  | 'sales'
  | 'appointments'
  | 'employees'
  | 'branches'
  | 'paymentMethods'
  | 'banks'
  | 'positions'
  | 'dashboard'
  | 'paymentMethodDetail'
  | 'paymentMethodByDay'
  | 'salesBySeller'
  | 'salesBySellerDay'
  | 'totalGeneral'
  | 'appointmentReport'
  | 'accessControl'

export interface ScreenConfig {
  key: ScreenKey
  path: string
  section: AccessSection
  labelKey: SidebarLabelKey
}

export const SCREEN_CONFIG: ScreenConfig[] = [
  { key: 'dashboard', path: '/', section: 'reports', labelKey: 'dashboard' },
  { key: 'ventas', path: '/ventas', section: 'forms', labelKey: 'sales' },
  { key: 'citas', path: '/citas', section: 'forms', labelKey: 'appointments' },
  { key: 'empleados', path: '/empleados', section: 'forms', labelKey: 'employees' },
  { key: 'sucursales', path: '/sucursales', section: 'forms', labelKey: 'branches' },
  { key: 'metodos-pago', path: '/metodos-pago', section: 'forms', labelKey: 'paymentMethods' },
  { key: 'bancos', path: '/bancos', section: 'forms', labelKey: 'banks' },
  { key: 'puestos', path: '/puestos', section: 'forms', labelKey: 'positions' },
  { key: 'reportes/detalle-metodo-pago', path: '/reportes/detalle-metodo-pago', section: 'reports', labelKey: 'paymentMethodDetail' },
  { key: 'reportes/metodo-pago-por-dia', path: '/reportes/metodo-pago-por-dia', section: 'reports', labelKey: 'paymentMethodByDay' },
  { key: 'reportes/ventas-por-vendedor', path: '/reportes/ventas-por-vendedor', section: 'reports', labelKey: 'salesBySeller' },
  { key: 'reportes/ventas-por-vendedor-dia', path: '/reportes/ventas-por-vendedor-dia', section: 'reports', labelKey: 'salesBySellerDay' },
  { key: 'reportes/total-general', path: '/reportes/total-general', section: 'reports', labelKey: 'totalGeneral' },
  { key: 'reportes/citas', path: '/reportes/citas', section: 'reports', labelKey: 'appointmentReport' },
  { key: 'accesos', path: '/accesos', section: 'admin', labelKey: 'accessControl' },
]

export const SECTION_ORDER: AccessSection[] = ['forms', 'reports', 'admin']

export function getScreenConfigByPath(pathname: string): ScreenConfig | null {
  const normalized = pathname === '' ? '/' : pathname
  return SCREEN_CONFIG.find((screen) => screen.path === normalized) ?? null
}

export function getFirstAccessiblePath(permissions: ScreenKey[], canManageAccess = false): string | null {
  if (canManageAccess) {
    return SCREEN_CONFIG[0]?.path ?? null
  }

  const permissionSet = new Set(permissions)
  const first = SCREEN_CONFIG.find((screen) => screen.key !== 'accesos' && permissionSet.has(screen.key))
  return first?.path ?? null
}
