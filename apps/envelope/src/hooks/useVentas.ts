"use client";
// Hook para gestión de ventas — CRUD contra el backend real
// Transforma Venta+VentaDetalle del backend ↔ RegistroVenta del frontend
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { RegistroVenta, VentaItem } from "@/lib/mock-data";

interface UseVentasReturn {
  registros: RegistroVenta[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  add: (r: RegistroVenta) => Promise<void>;
  addBatch: (records: RegistroVenta[]) => Promise<void>;
  updateBatch: (originalIds: string[], records: RegistroVenta[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

interface UseVentasOptions {
  fechaInicio?: string;
  fechaFin?: string;
  enabled?: boolean;
  includeProtectedForEnvelope?: boolean;
}

// Respuesta cruda de la API para una Venta
interface VentaRaw {
  id: string;
  fecha: string;
  notas?: string | null;
  sesionId?: string | null;
  sucursalId: string;
  sucursal?: { nombre: string };
  vendedorId: string;
  vendedor?: {
    nombreCompleto: string;
    protectedIdentity?: { key: "KEYSAR_HOME" } | null;
  };
  detalles: { id: string; cantidad: string; metodoPagoId: string; metodoPago?: { nombre: string } }[];
}

/** Convierte una Venta del backend al tipo RegistroVenta que usan las páginas */
function toRegistroVenta(v: VentaRaw): RegistroVenta {
  return {
    id: v.id,
    sucursalId: v.sucursalId,
    ...(v.sucursal ? { sucursalNombre: v.sucursal.nombre } : {}),
    vendedorId: v.vendedorId,
    ...(v.vendedor ? { vendedorNombre: v.vendedor.nombreCompleto } : {}),
    vendedorIdentidadProtegida: v.vendedor?.protectedIdentity?.key ?? null,
    // El backend devuelve DateTime ISO; tomamos solo la parte de fecha
    fecha: v.fecha.slice(0, 10),
    sesionId: v.sesionId ?? null,
    items: v.detalles.map(
      (d): VentaItem => ({
        id: d.id,
        cantidad: Number(d.cantidad),
        metodoPagoId: d.metodoPagoId,
        ...(d.metodoPago ? { metodoPagoNombre: d.metodoPago.nombre } : {}),
        // notas está a nivel de Venta en el backend; se propaga al item para compatibilidad
        ...(v.notas ? { notas: v.notas } : {}),
      }),
    ),
  };
}

export function useVentas(options: UseVentasOptions = {}): UseVentasReturn {
  const {
    fechaInicio,
    fechaFin,
    enabled = true,
    includeProtectedForEnvelope = false,
  } = options;
  const [registros, setRegistros] = useState<RegistroVenta[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setRegistros([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ success: boolean; data: VentaRaw[] }>(
        "/api/envelope/ventas",
        {
          params: {
            ...(fechaInicio ? { fechaInicio } : {}),
            ...(fechaFin ? { fechaFin } : {}),
            ...(includeProtectedForEnvelope
              ? { includeProtectedForEnvelope: true }
              : {}),
          },
        },
      );
      setRegistros(data.data.map(toRegistroVenta));
    } catch {
      setError("Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  }, [enabled, fechaFin, fechaInicio, includeProtectedForEnvelope]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const add = useCallback(
    async (registro: RegistroVenta) => {
      // Agrupa las notas de los items en un único campo a nivel de venta
      const notas = registro.items
        .map((i) => i.notas)
        .filter(Boolean)
        .join("; ");

      await api.post("/api/envelope/ventas", {
        sucursalId: registro.sucursalId,
        vendedorId: registro.vendedorId,
        fecha: registro.fecha,
        ...(notas ? { notas } : {}),
        ...(registro.sesionId ? { sesionId: registro.sesionId } : {}),
        detalles: registro.items.map((i) => ({
          cantidad: i.cantidad,
          metodoPagoId: i.metodoPagoId,
        })),
      });
      await refetch();
    },
    [refetch],
  );

  const addBatch = useCallback(
    async (records: RegistroVenta[]) => {
      await api.post("/api/envelope/ventas/lote", {
        ventas: records.map((record) => ({
          sucursalId: record.sucursalId,
          vendedorId: record.vendedorId,
          fecha: record.fecha,
          ...(record.sesionId ? { sesionId: record.sesionId } : {}),
          detalles: record.items.map((item) => ({
            cantidad: item.cantidad,
            metodoPagoId: item.metodoPagoId,
          })),
        })),
      });
      await refetch();
    },
    [refetch],
  );

  const updateBatch = useCallback(
    async (originalIds: string[], records: RegistroVenta[]) => {
      await api.put("/api/envelope/ventas/lote", {
        originalIds,
        ventas: records.map((record) => ({
          sucursalId: record.sucursalId,
          vendedorId: record.vendedorId,
          fecha: record.fecha,
          ...(record.sesionId ? { sesionId: record.sesionId } : {}),
          detalles: record.items.map((item) => ({
            cantidad: item.cantidad,
            metodoPagoId: item.metodoPagoId,
          })),
        })),
      });
      await refetch();
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.delete(`/api/envelope/ventas/${id}`);
      await refetch();
    },
    [refetch],
  );

  return { registros, loading, error, refetch, add, addBatch, updateBatch, remove };
}
