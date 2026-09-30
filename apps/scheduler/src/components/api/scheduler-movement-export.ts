import type { DesignMovementRecord } from "../../../design/contracts";

const movementTimeZone = "America/Mexico_City";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: movementTimeZone,
});

const dayLabelFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeZone: movementTimeZone,
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: movementTimeZone,
});

export interface DesignMovementGroup {
  id: string;
  dayKey: string;
  dayLabel: string;
  actorId: string;
  actor: string;
  actorRole: string;
  actorSource: DesignMovementRecord["actorSource"];
  firstActivityAt: string;
  lastActivityAt: string;
  movements: DesignMovementRecord[];
}

function movementDayKey(createdAt: string): string {
  const parts = Object.fromEntries(
    dayKeyFormatter
      .formatToParts(new Date(createdAt))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts["year"]}-${parts["month"]}-${parts["day"]}`;
}

export function formatMovementTime(createdAt: string): string {
  return timeFormatter.format(new Date(createdAt));
}

export function groupDesignMovements(
  movements: DesignMovementRecord[],
): DesignMovementGroup[] {
  const groups = new Map<string, DesignMovementGroup>();

  for (const movement of movements) {
    const dayKey = movementDayKey(movement.createdAt);
    const id = `${movement.actorId}:${dayKey}`;
    const group = groups.get(id);
    if (group) {
      group.movements.push(movement);
      if (movement.createdAt < group.firstActivityAt) {
        group.firstActivityAt = movement.createdAt;
      }
      if (movement.createdAt > group.lastActivityAt) {
        group.lastActivityAt = movement.createdAt;
      }
      continue;
    }

    groups.set(id, {
      id,
      dayKey,
      dayLabel: dayLabelFormatter.format(new Date(movement.createdAt)),
      actorId: movement.actorId,
      actor: movement.actor,
      actorRole: movement.actorRole,
      actorSource: movement.actorSource,
      firstActivityAt: movement.createdAt,
      lastActivityAt: movement.createdAt,
      movements: [movement],
    });
  }

  return [...groups.values()].sort((left, right) =>
    right.lastActivityAt.localeCompare(left.lastActivityAt),
  );
}

function fitColumns(rows: unknown[][], maximumWidth = 42) {
  const columnCount = Math.max(0, ...rows.map((row) => row.length));
  return Array.from({ length: columnCount }, (_value, columnIndex) => ({
    wch: Math.min(
      maximumWidth,
      Math.max(
        10,
        ...rows.map((row) => String(row[columnIndex] ?? "").length + 2),
      ),
    ),
  }));
}

function formatDateColumn(
  worksheet: Record<string, unknown>,
  column: string,
  firstRow: number,
  lastRow: number,
  numberFormat: string,
) {
  for (let row = firstRow; row <= lastRow; row += 1) {
    const cell = worksheet[`${column}${row}`] as { z?: string } | undefined;
    if (cell) cell.z = numberFormat;
  }
}

export async function exportDesignMovementsXlsx(
  movements: DesignMovementRecord[],
) {
  const XLSX = await import("xlsx");
  const groups = groupDesignMovements(movements);
  const summaryRows: unknown[][] = [
    [
      "Fecha",
      "Agente",
      "Puesto",
      "Origen",
      "Movimientos",
      "Primera actividad",
      "Última actividad",
    ],
    ...groups.map((group) => [
      new Date(`${group.dayKey}T12:00:00`),
      group.actor,
      group.actorRole,
      group.actorSource,
      group.movements.length,
      new Date(group.firstActivityAt),
      new Date(group.lastActivityAt),
    ]),
  ];
  const detailRows: unknown[][] = [
    [
      "Fecha y hora",
      "Agente",
      "Puesto",
      "Origen",
      "Movimiento",
      "Propósito",
      "Tipo de registro",
      "ID de registro",
      "Datos adicionales",
    ],
    ...movements.map((movement) => [
      new Date(movement.createdAt),
      movement.actor,
      movement.actorRole,
      movement.actorSource,
      movement.action,
      movement.purpose,
      movement.targetType,
      movement.targetId,
      Object.keys(movement.metadata).length
        ? JSON.stringify(movement.metadata)
        : "",
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet(summaryRows, { cellDates: true });
  const detail = XLSX.utils.aoa_to_sheet(detailRows, { cellDates: true });
  summary["!cols"] = fitColumns(summaryRows);
  detail["!cols"] = fitColumns(detailRows);
  summary["!autofilter"] = { ref: `A1:G${summaryRows.length}` };
  detail["!autofilter"] = { ref: `A1:I${detailRows.length}` };
  formatDateColumn(summary, "A", 2, summaryRows.length, "dd/mm/yyyy");
  formatDateColumn(summary, "F", 2, summaryRows.length, "dd/mm/yyyy hh:mm:ss");
  formatDateColumn(summary, "G", 2, summaryRows.length, "dd/mm/yyyy hh:mm:ss");
  formatDateColumn(detail, "A", 2, detailRows.length, "dd/mm/yyyy hh:mm:ss");
  XLSX.utils.book_append_sheet(workbook, summary, "Resumen por agente");
  XLSX.utils.book_append_sheet(workbook, detail, "Detalle");

  const today = movementDayKey(new Date().toISOString());
  XLSX.writeFile(workbook, `scheduler-movimientos-${today}.xlsx`, {
    compression: true,
  });
}
