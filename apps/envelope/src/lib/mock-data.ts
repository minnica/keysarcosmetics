// Datos mock para desarrollo — arrays en memoria
// Generan 3 meses de ventas realistas para las demos de reportes

import { generateId } from "./utils";

// ─── Tipos locales ────────────────────────────────────────────────────────────

export type Banco = string;
export const PUESTOS = [
  "VENDEDOR",
  "GERENTE",
  "FACIALISTA",
  "CERRADOR",
  "ADMINISTRADOR GENERAL",
  "CALL CENTER",
  "CONTADOR",
  "MANTENIMIENTO",
  "EXTERNO",
  "ADMINISTRADOR",
] as const;

export type Puesto = (typeof PUESTOS)[number];

export interface Sucursal {
  id: string;
  nombre: string;
}

export interface MetodoPago {
  id: string;
  nombre: string;
}

export interface Empleado {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  // Campos legacy — se eliminan en Fase 4 tras backfill completo
  banco: string;
  numeroCuenta: string;
  puesto: string;
  // FK a catálogos dinámicos — nullable durante transición
  bankId?: string | null;
  bank?: { id: string; nombre: string; activo: boolean } | null;
  positionId?: string | null;
  position?: { id: string; nombre: string; activo: boolean } | null;
  metaIndividual: number;
}

export interface VentaItem {
  id: string;
  cantidad: number;
  metodoPagoId: string;
  notas?: string;
}

export interface RegistroVenta {
  id: string;
  sucursalId: string;
  vendedorId: string;
  fecha: string; // YYYY-MM-DD
  items: VentaItem[];
  // Comparte sesionId con otros registros del mismo voucher multi-vendedor; null = venta individual
  sesionId?: string | null;
}

// ─── Catálogos base ──────────────────────────────────────────────────────────

export const INITIAL_SUCURSALES: Sucursal[] = [
  { id: "s1", nombre: "Sucursal Centro" },
  { id: "s2", nombre: "Sucursal Norte" },
  { id: "s3", nombre: "Sucursal Sur" },
];

export const INITIAL_METODOS_PAGO: MetodoPago[] = [
  { id: "mp1", nombre: "Efectivo" },
  { id: "mp2", nombre: "Tarjeta" },
  { id: "mp3", nombre: "Transferencia" },
  { id: "mp4", nombre: "Vale" },
];

export const INITIAL_EMPLEADOS: Empleado[] = [
  {
    id: "e1",
    nombres: "María",
    apellidoPaterno: "García",
    apellidoMaterno: "López",
    nombreCompleto: "María García López",
    banco: "BBVA",
    numeroCuenta: "1234567890",
    puesto: "VENDEDOR",
    metaIndividual: 50000,
  },
  {
    id: "e2",
    nombres: "Juan Carlos",
    apellidoPaterno: "Martínez",
    apellidoMaterno: "Sánchez",
    nombreCompleto: "Juan Carlos Martínez Sánchez",
    banco: "Santander",
    numeroCuenta: "0987654321",
    puesto: "VENDEDOR",
    metaIndividual: 45000,
  },
  {
    id: "e3",
    nombres: "Ana",
    apellidoPaterno: "Rodríguez",
    apellidoMaterno: "Torres",
    nombreCompleto: "Ana Rodríguez Torres",
    banco: "Banorte",
    numeroCuenta: "1122334455",
    puesto: "VENDEDOR",
    metaIndividual: 55000,
  },
  {
    id: "e4",
    nombres: "Luis",
    apellidoPaterno: "Hernández",
    apellidoMaterno: "Cruz",
    nombreCompleto: "Luis Hernández Cruz",
    banco: "HSBC",
    numeroCuenta: "5544332211",
    puesto: "VENDEDOR",
    metaIndividual: 40000,
  },
  {
    id: "e5",
    nombres: "Sofía",
    apellidoPaterno: "Pérez",
    apellidoMaterno: "Morales",
    nombreCompleto: "Sofía Pérez Morales",
    banco: "Banamex",
    numeroCuenta: "9988776655",
    puesto: "VENDEDOR",
    metaIndividual: 60000,
  },
  {
    id: "e6",
    nombres: "Roberto",
    apellidoPaterno: "Flores",
    apellidoMaterno: "Vega",
    nombreCompleto: "Roberto Flores Vega",
    banco: "BBVA",
    numeroCuenta: "6677889900",
    puesto: "GERENTE",
    metaIndividual: 80000,
  },
];

// ─── Generador de ventas mock (3 meses) ──────────────────────────────────────

function generateMockRegistros(): RegistroVenta[] {
  const registros: RegistroVenta[] = [];
  const metodosIds = ["mp1", "mp2", "mp3", "mp4"];
  const hoy = new Date();

  // Generar datos para los últimos 90 días (~3 meses)
  for (let diasAtras = 90; diasAtras >= 0; diasAtras--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - diasAtras);
    // Saltar domingos (negocio cerrado)
    if (fecha.getDay() === 0) continue;

    const fechaStr = fecha.toISOString().slice(0, 10);

    // Cada empleado tiene ~80% de probabilidad de registrar ventas ese día
    for (const emp of INITIAL_EMPLEADOS) {
      if (Math.random() > 0.8) continue;

      // Entre 1 y 4 ventas por día por vendedor
      const numVentas = Math.floor(Math.random() * 4) + 1;
      const items: VentaItem[] = [];

      for (let i = 0; i < numVentas; i++) {
        // Montos realistas para cosméticos: $800 – $8,500
        const base = 800 + Math.floor(Math.random() * 7700);
        // Redondear a múltiplos de 50
        const cantidad = Math.round(base / 50) * 50;

        const notas = Math.random() > 0.7 ? "Venta de mostrador" : undefined;

        items.push({
          id: generateId(),
          cantidad,
          metodoPagoId:
            metodosIds[Math.floor(Math.random() * metodosIds.length)]!,
          ...(notas ? { notas } : {}),
        });
      }

      // Asignar sucursal aleatoria — el vendedor puede trabajar en cualquier sucursal
      const sucursalAleatoria =
        INITIAL_SUCURSALES[
          Math.floor(Math.random() * INITIAL_SUCURSALES.length)
        ]!;
      registros.push({
        id: generateId(),
        sucursalId: sucursalAleatoria.id,
        vendedorId: emp.id,
        fecha: fechaStr,
        items,
      });
    }
  }

  return registros;
}

export const INITIAL_REGISTROS: RegistroVenta[] = generateMockRegistros();
