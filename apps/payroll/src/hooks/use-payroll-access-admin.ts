"use client";

import { useCallback, useEffect, useState } from "react";
import type { PayrollScreenKey, Rol } from "@cosmetics/types";
import { api, apiErrorMessage } from "@/lib/api";

export interface PayrollAccessPermission {
  screenKey: PayrollScreenKey;
  allowed: boolean;
  canWrite: boolean;
}

export interface PayrollAccessPosition {
  id: string;
  nombre: string;
  activo: boolean;
  canManagePayrollAccess: boolean;
  payrollScreenPermissions: PayrollAccessPermission[];
  _count: { empleados: number };
}

export interface PayrollAccessEmployee {
  id: string;
  nombreCompleto: string;
  activo: boolean;
  positionId: string | null;
  position: {
    id: string;
    nombre: string;
    canManagePayrollAccess: boolean;
  } | null;
}

export interface PayrollAccessUser {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  empleadoId: string | null;
  empleado: {
    id: string;
    nombreCompleto: string;
    position: {
      id: string;
      nombre: string;
      canManagePayrollAccess: boolean;
    } | null;
  } | null;
}

interface BootstrapResponse {
  screens: PayrollScreenKey[];
  positions: PayrollAccessPosition[];
  employees: PayrollAccessEmployee[];
  users: PayrollAccessUser[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export function usePayrollAccessAdmin() {
  const [positions, setPositions] = useState<PayrollAccessPosition[]>([]);
  const [employees, setEmployees] = useState<PayrollAccessEmployee[]>([]);
  const [users, setUsers] = useState<PayrollAccessUser[]>([]);
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
      setEmployees(response.data.data.employees);
      setUsers(response.data.data.users);
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

  const saveCredentials = useCallback(
    async (employeeId: string, payload: { email: string; password?: string }) => {
      await api.put(
        `/api/payroll/access/users/${employeeId}/credentials`,
        payload,
      );
      await refetch();
    },
    [refetch],
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      await api.delete(`/api/payroll/access/users/${userId}`);
      await refetch();
    },
    [refetch],
  );

  return {
    positions,
    employees,
    users,
    loading,
    error,
    refetch,
    savePermissions,
    saveCredentials,
    deleteUser,
  };
}
