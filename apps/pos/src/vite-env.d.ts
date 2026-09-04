/// <reference types="vite/client" />

import type {
  ApiResponse,
  PosOfflineBootstrapDto,
  PosOfflineOperationKind,
  PosOfflinePushResultDto,
  PosSessionDto,
  PosSyncStatus,
} from "@cosmetics/types";

declare global {
  interface Window {
    electronAPI?: {
      posLogin(input: { alias: string; pin: string }): Promise<{
        status: number;
        body: ApiResponse<PosSessionDto>;
        offline: boolean;
        bootstrap: PosOfflineBootstrapDto | null;
      }>;
      posOfflineEnqueue(input: {
        kind: PosOfflineOperationKind;
        entityId?: string | null;
        dependsOn?: string[];
        payload: Record<string, unknown>;
        createdAt?: string;
      }): Promise<{ id: string; sequence: number; status: "PENDING" }>;
      posOfflineStatus(): Promise<Array<{
        id: string;
        sequence: number;
        kind: PosOfflineOperationKind;
        status: PosSyncStatus;
        attempts: number;
        errorMessage: string | null;
      }>>;
      posOfflineAuthorize(pin: string): Promise<boolean>;
      posOfflineSync(): Promise<PosOfflinePushResultDto>;
      posOfflineLogout(): Promise<void>;
    };
  }
}
