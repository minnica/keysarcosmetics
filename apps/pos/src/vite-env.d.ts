/// <reference types="vite/client" />

import type { ApiResponse, PosSessionDto } from "@cosmetics/types";

declare global {
  interface Window {
    electronAPI?: {
      ping(): Promise<unknown>;
      posLogin(input: { alias: string; pin: string }): Promise<{
        status: number;
        body: ApiResponse<PosSessionDto>;
      }>;
    };
  }
}
