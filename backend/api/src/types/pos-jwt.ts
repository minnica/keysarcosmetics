import type { PosPermissionKey } from "@cosmetics/types";

export interface PosJwtPayload {
  tokenType: "pos";
  credentialId: string;
  actorId: string;
  employeeId: string | null;
  userId: string | null;
  positionId: string | null;
  displayName: string;
  alias: string;
  sessionId: string;
  terminalId: string;
  branchId: string;
  credentialVersion: number;
  isMaster: boolean;
  permissions: PosPermissionKey[];
  iat?: number;
  exp?: number;
}

export interface PosRequestUser extends PosJwtPayload {
  authorizedBranchIds: string[];
  authorizedHistoricalBranchIds: string[];
  branchScope: "SESSION_BRANCH" | "ASSIGNED" | "ALL_ACTIVE";
}

export interface PosOfflineGrantPayload extends Omit<
  PosJwtPayload,
  "tokenType"
> {
  tokenType: "pos-offline";
}
