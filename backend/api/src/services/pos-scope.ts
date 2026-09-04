import type { PosBranchSummaryDto } from "@cosmetics/types";
import { prisma } from "../prisma/client";

export type PosBranchScopeMode = "SESSION_BRANCH" | "ASSIGNED" | "ALL_ACTIVE";

export class PosScopeError extends Error {
  readonly status = 403;
}

export interface PosResolvedBranchScope {
  mode: PosBranchScopeMode;
  branches: PosBranchSummaryDto[];
  branchIds: string[];
}

const branchDto = (branch: {
  id: string;
  nombre: string;
  activa: boolean;
  posProfile: { code: string } | null;
}): PosBranchSummaryDto => ({
  id: branch.id,
  name: branch.nombre,
  code: branch.posProfile?.code ?? null,
  active: branch.activa,
});

/**
 * Resuelve el alcance vigente desde asignaciones explícitas. Los tickets
 * históricos nunca se utilizan para descubrir sucursales.
 */
export async function resolvePosAuthorizedBranches(input: {
  credentialId: string;
  positionId: string | null;
  isMaster: boolean;
  sessionBranchId: string;
}): Promise<PosResolvedBranchScope> {
  if (input.isMaster) {
    const branches = await prisma.sucursal.findMany({
      where: { activa: true },
      include: { posProfile: { select: { code: true } } },
      orderBy: { nombre: "asc" },
    });
    return {
      mode: "ALL_ACTIVE",
      branches: branches.map(branchDto),
      branchIds: branches.map((branch) => branch.id),
    };
  }

  const [positionAssignments, credentialAssignments] = await Promise.all([
    input.positionId
      ? prisma.posPositionBranchAssignment.findMany({
          where: { positionId: input.positionId },
          select: { branchId: true, branch: { select: { activa: true } } },
        })
      : Promise.resolve([]),
    prisma.posCredentialBranchAssignment.findMany({
      where: { credentialId: input.credentialId },
      select: { branchId: true, branch: { select: { activa: true } } },
    }),
  ]);
  const assignments = [...positionAssignments, ...credentialAssignments];
  const assignedIds = new Set(
    assignments
      .filter((assignment) => assignment.branch.activa)
      .map((assignment) => assignment.branchId),
  );
  const hasExplicitAssignments = assignments.length > 0;
  if (hasExplicitAssignments && !assignedIds.has(input.sessionBranchId)) {
    throw new PosScopeError(
      "La credencial no está asignada a la sucursal de esta terminal",
    );
  }
  if (!hasExplicitAssignments) assignedIds.add(input.sessionBranchId);
  const branches = await prisma.sucursal.findMany({
    where: { id: { in: [...assignedIds] }, activa: true },
    include: { posProfile: { select: { code: true } } },
    orderBy: { nombre: "asc" },
  });
  return {
    mode: hasExplicitAssignments ? "ASSIGNED" : "SESSION_BRANCH",
    branches: branches.map(branchDto),
    branchIds: branches.map((branch) => branch.id),
  };
}

/** `all_authorized` se materializa siempre como la unión exacta autorizada. */
export function resolveRequestedBranchIds(input: {
  authorizedBranchIds: readonly string[];
  requestedBranchIds?: readonly string[];
}): string[] {
  const authorized = new Set(input.authorizedBranchIds);
  const requested = [...new Set(input.requestedBranchIds ?? [])];
  if (requested.length === 0) return [...authorized];
  if (requested.some((branchId) => !authorized.has(branchId))) {
    throw new PosScopeError("La consulta incluye una sucursal no autorizada");
  }
  return requested;
}

export function assertBranchAuthorized(
  authorizedBranchIds: readonly string[],
  branchId: string,
): void {
  if (!authorizedBranchIds.includes(branchId)) {
    throw new PosScopeError("La sucursal solicitada no está autorizada");
  }
}
