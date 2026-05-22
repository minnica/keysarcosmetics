'use client'
// Hook combinado para las pantallas de reportes
// Provee los cuatro catálogos y todos los registros de ventas en un único punto
import { useSucursales } from './useSucursales'
import { useEmpleados } from './useEmpleados'
import { useMetodosPago } from './useMetodosPago'
import { useVentas } from './useVentas'
import type { Sucursal, MetodoPago, Empleado, RegistroVenta } from '@/lib/mock-data'

export interface UseReportesReturn {
  sucursales: Sucursal[]
  empleados: Empleado[]
  metodosPago: MetodoPago[]
  registros: RegistroVenta[]
  loading: boolean
  error: string | null
}

/**
 * Agrega los cuatro hooks de datos en uno solo.
 * Las páginas de reportes hacen toda la agregación en el cliente,
 * igual que con el mock data anterior — solo cambia la fuente de datos.
 */
export function useReportes(): UseReportesReturn {
  const { sucursales, loading: lS, error: eS } = useSucursales()
  const { empleados, loading: lE, error: eE } = useEmpleados()
  const { metodosPago, loading: lM, error: eM } = useMetodosPago()
  const { registros, loading: lV, error: eV } = useVentas()

  const loading = lS || lE || lM || lV
  const error = eS ?? eE ?? eM ?? eV ?? null

  return { sucursales, empleados, metodosPago, registros, loading, error }
}
