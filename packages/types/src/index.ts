// Tipos compartidos del sistema de cosméticos

export type Rol = 'SUPER_ADMIN' | 'GERENTE' | 'CAPTURISTA'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  sucursalId?: string
  activo: boolean
  creadoEn: Date
}

export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO'

export interface Sucursal {
  id: string
  nombre: string
  activa: boolean
}

export interface Bank {
  id: string
  nombre: string
  activo: boolean
}

export interface Position {
  id: string
  nombre: string
  activo: boolean
}

export interface Empleado {
  id: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
  // Campos legacy — se eliminan en Fase 4
  banco: string
  numeroCuenta: string
  puesto: string
  sueldo?: number | null
  fechaNacimiento?: string | null
  numeroTelefono?: string | null
  // FK a catálogos dinámicos — nullable durante transición
  bankId?: string | null
  bank?: Bank | null
  positionId?: string | null
  position?: Position | null
  metaIndividual: number
  sucursalId: string
  activo: boolean
}

export interface Venta {
  id: string
  sucursalId: string
  vendedorId: string
  total: number
  metodoPago: MetodoPago
  fecha: Date
  notas?: string
  creadoEn: Date
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}
