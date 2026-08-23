"use client";

import { useCallback, useEffect, useState } from "react";
import type { PayrollScreenKey } from "@cosmetics/types";
import { api, apiErrorMessage } from "@/lib/api";

export interface PayrollAccessPermission {
  screenKey: PayrollScreenKey;
  allowed: boolean;
}

export interface PayrollAccessPosition {
  id: string;
  nombre: string;
  activo: boolean;
  canManagePayrollAccess: boolean;
  payrollScreenPermissions: PayrollAccessPermission[];
  _count: { empleados: number };
}

interface BootstrapResponse {
  screens: PayrollScreenKey[];
  positions: PayrollAccessPosition[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export function usePayrollAccessAdmin() {
  const [positions, setPositions] = useState<PayrollAccessPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<BootstrapResponse>>(
        "/api/payroll/access/bootstrap",
      );
      setPositions(response.data.data.positions);
    } catch (cause) {
      setError(
        apiErrorMessage(cause, "No se pudieron cargar los accesos de Payroll."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const savePermissions = useCallback(
    async (
      positionId: string,
      payload: {
        canManagePayrollAccess: boolean;
        permissions: PayrollAccessPermission[];
      },
    ) => {
      const response = await api.put<ApiResponse<PayrollAccessPosition>>(
        `/api/payroll/access/positions/${positionId}/permissions`,
        payload,
      );
      setPositions((current) =>
        current.map((position) =>
          position.id === positionId ? response.data.data : position,
        ),
      );
    },
    [],
  );

  return { positions, loading, error, refetch, savePermissions };
}
