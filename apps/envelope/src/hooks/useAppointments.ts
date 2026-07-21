"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CategoriaAtencion,
  EstatusCita,
  RegistroCita,
  TipoCompraCita,
} from "@cosmetics/types";
import { api } from "@/lib/api";

export interface AppointmentEmployee {
  id: string;
  nombreCompleto: string;
  puesto: string;
  position: { id: string; nombre: string } | null;
}

export interface AppointmentInput {
  fecha: string;
  hora: string;
  subcategoriaId: string;
  estatus: EstatusCita;
  nombreCliente: string;
  sucursalId: string;
  vendedorId: string;
  facialistaId: string;
  tipoCompra: TipoCompraCita | null;
  montoCompra: number;
  montoApartado: number;
  bonoSalidaTarde: boolean;
  bonoComida: boolean;
}

export interface AppointmentReportRow {
  facialistaId: string;
  facialistaNombre: string;
  sucursalId: string;
  sucursalNombre: string;
  totalCitas: number;
  faciales: number;
  corporales: number;
  atendidas: number;
  noLlegaron: number;
  canceladas: number;
  citasSinCompra: number;
  pagoNeto: number;
  compraConApartado: number;
  pagoDeApartado: number;
  total: number;
  bonosSalidaTarde: number;
  bonosComida: number;
}

export type AppointmentCategory = CategoriaAtencion & {
  subcategorias: Array<{ id: string; nombre: string; categoriaId: string }>;
};

type DateFilters = {
  fechaInicio: string;
  fechaFin: string;
};

type ReportFilters = DateFilters & {
  facialistaId?: string;
  sucursalId?: string;
};

function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}

export function useAppointmentCatalogs() {
  const [employees, setEmployees] = useState<AppointmentEmployee[]>([]);
  const [categories, setCategories] = useState<AppointmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get<{
          success: boolean;
          data: {
            empleados: AppointmentEmployee[];
            categorias: AppointmentCategory[];
          };
        }>("/api/envelope/citas/catalogos");
        if (active) setEmployees(response.data.data.empleados);
        if (active) setCategories(response.data.data.categorias);
      } catch (loadError) {
        if (active)
          setError(
            apiErrorMessage(loadError, "No se pudieron cargar los empleados"),
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return { employees, categories, loading, error };
}

export function useAppointments(filters: DateFilters) {
  const [records, setRecords] = useState<RegistroCita[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        success: boolean;
        data: RegistroCita[];
      }>("/api/envelope/citas", {
        params: filters,
      });
      setRecords(response.data.data);
      setLoaded(true);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "No se pudieron cargar las citas"));
    } finally {
      setLoading(false);
    }
  }, [filters.fechaFin, filters.fechaInicio]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const add = useCallback(
    async (input: AppointmentInput) => {
      try {
        await api.post("/api/envelope/citas", input);
        await refetch();
      } catch (saveError) {
        throw new Error(
          apiErrorMessage(saveError, "No se pudo registrar la cita"),
        );
      }
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, input: AppointmentInput) => {
      try {
        await api.put(`/api/envelope/citas/${id}`, input);
        await refetch();
      } catch (saveError) {
        throw new Error(
          apiErrorMessage(saveError, "No se pudo actualizar la cita"),
        );
      }
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/api/envelope/citas/${id}`);
        await refetch();
      } catch (deleteError) {
        throw new Error(
          apiErrorMessage(deleteError, "No se pudo eliminar la cita"),
        );
      }
    },
    [refetch],
  );

  return { records, loading, loaded, error, refetch, add, update, remove };
}

export function useAppointmentReport(filters: ReportFilters) {
  const [rows, setRows] = useState<AppointmentReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        success: boolean;
        data: AppointmentReportRow[];
      }>("/api/envelope/reportes/citas", {
        params: filters,
      });
      setRows(response.data.data);
    } catch (loadError) {
      setError(
        apiErrorMessage(loadError, "No se pudo generar el reporte de citas"),
      );
    } finally {
      setLoading(false);
    }
  }, [
    filters.facialistaId,
    filters.fechaFin,
    filters.fechaInicio,
    filters.sucursalId,
  ]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rows, loading, error, refetch };
}
