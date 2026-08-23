// Tipos compartidos del sistema de cosméticos

export type Rol = "SUPER_ADMIN" | "GERENTE" | "CAPTURISTA";

export const SCREEN_KEYS = [
  "dashboard",
  "ventas",
  "ventas/generar-sobre",
  "citas",
  "servicios",
  "empleados",
  "empleados/sueldo",
  "reportes/ver-datos-keysar-home",
  "sucursales",
  "metodos-pago",
  "bancos",
  "puestos",
  "reportes/detalle-metodo-pago",
  "reportes/metodo-pago-por-dia",
  "reportes/ventas-por-vendedor",
  "reportes/ventas-por-vendedor-dia",
  "reportes/ranking-vendedores",
  "reportes/ranking-sucursales",
  "reportes/total-general",
  "reportes/metas-sucursal",
  "reportes/citas",
  "accesos",
] as const;

export type ScreenKey = (typeof SCREEN_KEYS)[number];

export const PAYROLL_SCREEN_KEYS = [
  "payroll/resumen",
  "payroll/nomina-salario-fijo",
  "payroll/nomina-especialistas",
  "payroll/nomina-comisiones",
  "payroll/movimientos",
  "payroll/gastos",
  "payroll/prestamos-adelantos",
  "payroll/esquemas",
  "payroll/bonos",
  "payroll/multas",
  "payroll/viaticos",
  "payroll/reportes/desglose-sucursal",
  "payroll/recibos",
  "payroll/accesos",
] as const;

export type PayrollScreenKey = (typeof PAYROLL_SCREEN_KEYS)[number];

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  sucursalId?: string;
  activo: boolean;
  creadoEn: Date;
}

export interface UsuarioSession extends Usuario {
  empleadoId?: string | null;
  positionId?: string | null;
  positionName?: string | null;
  canManageAccess: boolean;
  selfDataOnly: boolean;
  screenPermissions: ScreenKey[];
  canManagePayrollAccess: boolean;
  payrollScreenPermissions: PayrollScreenKey[];
}

export type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "OTRO";

export interface Sucursal {
  id: string;
  nombre: string;
  metaMensual: number;
  activa: boolean;
  desactivadaEn: Date | null;
}

export interface Bank {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Position {
  id: string;
  nombre: string;
  activo: boolean;
  selfDataOnly?: boolean;
}

export interface Empleado {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  // Campos legacy — se eliminan en Fase 4
  banco: string;
  numeroCuenta: string;
  puesto: string;
  sueldo?: number | null;
  fechaNacimiento?: string | null;
  numeroTelefono?: string | null;
  // FK a catálogos dinámicos — nullable durante transición
  bankId?: string | null;
  bank?: Bank | null;
  positionId?: string | null;
  position?: Position | null;
  sucursalId: string | null;
  sucursal?: Sucursal | null;
  metaIndividual: number;
  activo: boolean;
}

export interface Venta {
  id: string;
  sucursalId: string;
  vendedorId: string;
  total: number;
  metodoPago: MetodoPago;
  fecha: Date;
  notas?: string;
  creadoEn: Date;
}

export type TipoCompraCita =
  | "PAGO_NETO"
  | "COMPRA_CON_APARTADO"
  | "PAGO_DE_APARTADO";
export type EstatusCita = "ATENDIDA" | "NO_LLEGO" | "CANCELADA";

export interface CategoriaAtencion {
  id: string;
  nombre: string;
  activa: boolean;
}

export interface SubcategoriaAtencion {
  id: string;
  nombre: string;
  activa: boolean;
  categoriaId: string;
  categoria: CategoriaAtencion;
}

export interface RegistroCita {
  id: string;
  fecha: string;
  hora: string | null;
  subcategoriaId: string;
  subcategoriaNombre: string;
  categoriaId: string;
  categoriaNombre: string;
  estatus: EstatusCita;
  nombreCliente: string;
  sucursalId: string;
  sucursalNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  facialistaId: string;
  facialistaNombre: string;
  tipoCompra: TipoCompraCita | null;
  montoCompra: number;
  montoApartado: number;
  total: number;
  bonoSalidaTarde: boolean;
  bonoComida: boolean;
  creadoPorId: string;
  creadoPorNombre: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}
