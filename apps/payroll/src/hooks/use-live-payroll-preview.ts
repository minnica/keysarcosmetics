"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import {
  currentFortnightValue,
  payrollPeriodOptions,
} from "@/lib/payroll-periods";
import { mapPayrollLivePreview } from "@/lib/payroll-run-mappers";
import type { PayrollCalculationMode, PayrollLivePreview } from "@/lib/types";

type ApiResponse<T> = { success: boolean; data: T; message: string };

const LIVE_REFRESH_INTERVAL_MS = 60_000;
const PAYROLL_CALCULATION_TIMEOUT_MS = 120_000;

export function useLivePayrollPreview() {
  const options = useMemo(() => payrollPeriodOptions(), []);
  const [periodValue, setPeriodValue] = useState(currentFortnightValue);
  const [mode, setMode] = useState<PayrollCalculationMode>("WITH_VAT");
  const [preview, setPreview] = useState<PayrollLivePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const mounted = useRef(true);

  const selectedPeriod =
    options.find((option) => option.value === periodValue) ?? options[0]!;

  const load = useCallback(
    async (initial = false) => {
      const requestId = ++requestSequence.current;
      if (initial) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const response = await api.get<ApiResponse<unknown>>(
          "/api/payroll/reports/live-preview",
          {
            params: {
              periodStart: selectedPeriod.from,
              periodEnd: selectedPeriod.to,
              mode,
            },
            timeout: PAYROLL_CALCULATION_TIMEOUT_MS,
          },
        );
        if (mounted.current && requestId === requestSequence.current) {
          setPreview(mapPayrollLivePreview(response.data.data));
        }
      } catch (cause) {
        if (mounted.current && requestId === requestSequence.current) {
          setError(
            apiErrorMessage(cause, "No se pudo calcular la vista actual."),
          );
        }
      } finally {
        if (mounted.current && requestId === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [mode, selectedPeriod.from, selectedPeriod.to],
  );

  useEffect(() => {
    mounted.current = true;
    void load(true);
    const interval = window.setInterval(
      () => void load(),
      LIVE_REFRESH_INTERVAL_MS,
    );
    const refreshOnFocus = () => void load();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [load]);

  return {
    options,
    selectedPeriod,
    periodValue,
    setPeriodValue,
    mode,
    setMode,
    preview,
    loading,
    refreshing,
    error,
    refresh: () => load(),
  };
}
