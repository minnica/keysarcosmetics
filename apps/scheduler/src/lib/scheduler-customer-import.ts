import type {
  SchedulerCustomerContactPreference,
  SchedulerCustomerFieldDefinitionDto,
  SchedulerCustomerSourceDto,
  SchedulerCustomerWriteDto,
} from "@cosmetics/types";

export interface SchedulerCustomerImportIssue {
  rowNumber: number;
  severity: "ERROR" | "WARNING";
  message: string;
}

export interface SchedulerCustomerImportRow {
  rowNumber: number;
  input: Omit<SchedulerCustomerWriteDto, "branchId">;
}

export interface SchedulerCustomerImportPreview {
  rows: SchedulerCustomerImportRow[];
  issues: SchedulerCustomerImportIssue[];
}

const baseHeaders = [
  "Nombre completo *",
  "Teléfono",
  "Correo principal",
  "Correos alternos",
  "Procedencia",
  "Nombre preferido",
  "Canal de contacto",
  "Alias",
  "Notas",
  "Notas de perfil",
] as const;

const contactPreferences: Record<string, SchedulerCustomerContactPreference> = {
  llamada: "PHONE",
  phone: "PHONE",
  whatsapp: "WHATSAPP",
  correo: "EMAIL",
  email: "EMAIL",
  "sin preferencia": "NONE",
  none: "NONE",
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value)
    .replace(/\s*\*\s*$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");
}

function splitList(value: unknown): string[] {
  return [
    ...new Set(
      normalizeText(value)
        .split(/[\n,;]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function parseBoolean(value: unknown): boolean | null {
  const normalized = normalizeKey(value);
  if (["si", "true", "1"].includes(normalized)) return true;
  if (["no", "false", "0"].includes(normalized)) return false;
  return null;
}

function customHeader(definition: SchedulerCustomerFieldDefinitionDto) {
  return `${definition.label}${definition.required ? " *" : ""}`;
}

export function schedulerCustomerImportHeaders(
  definitions: SchedulerCustomerFieldDefinitionDto[],
): string[] {
  return [
    ...baseHeaders,
    ...definitions.filter((definition) => definition.active).map(customHeader),
  ];
}

export function parseSchedulerCustomerImportMatrix(
  matrix: unknown[][],
  definitions: SchedulerCustomerFieldDefinitionDto[],
  sources: SchedulerCustomerSourceDto[],
): SchedulerCustomerImportPreview {
  const activeDefinitions = definitions.filter(
    (definition) => definition.active,
  );
  const expectedHeaders = schedulerCustomerImportHeaders(activeDefinitions);
  const actualHeaders = (matrix[0] ?? []).map(normalizeKey);
  const columnByHeader = new Map(
    actualHeaders.map((header, index) => [header, index] as const),
  );
  const issues: SchedulerCustomerImportIssue[] = [];
  const requiredHeaders = [
    normalizeKey(baseHeaders[0]),
    ...activeDefinitions
      .filter((definition) => definition.required)
      .map((definition) => normalizeKey(customHeader(definition))),
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!columnByHeader.has(requiredHeader)) {
      issues.push({
        rowNumber: 1,
        severity: "ERROR",
        message: `Falta la columna obligatoria “${expectedHeaders.find((header) => normalizeKey(header) === requiredHeader) ?? requiredHeader}”.`,
      });
    }
  }
  if (issues.length) return { rows: [], issues };

  const sourceByName = new Map(
    sources
      .filter((source) => source.active)
      .map((source) => [normalizeKey(source.name), source] as const),
  );
  const rows: SchedulerCustomerImportRow[] = [];
  const phoneRows = new Map<string, number>();
  const nameRows = new Map<string, number>();
  const valueAt = (row: unknown[], header: string) =>
    row[columnByHeader.get(normalizeKey(header)) ?? -1];

  matrix.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.some((cell) => normalizeText(cell))) return;

    const displayName = normalizeText(valueAt(row, baseHeaders[0]));
    const phone = normalizeText(valueAt(row, baseHeaders[1]));
    const phoneDigits = phone.replace(/\D/g, "");
    const email = normalizeText(valueAt(row, baseHeaders[2])).toLowerCase();
    const sourceName = normalizeText(valueAt(row, baseHeaders[4]));
    const source = sourceName
      ? sourceByName.get(normalizeKey(sourceName))
      : null;
    const preferenceText = normalizeText(valueAt(row, baseHeaders[6]));
    const contactPreference = preferenceText
      ? contactPreferences[normalizeKey(preferenceText)]
      : "WHATSAPP";
    const rowIssues: SchedulerCustomerImportIssue[] = [];

    if (displayName.length < 2) {
      rowIssues.push({
        rowNumber,
        severity: "ERROR",
        message: "Captura el nombre completo.",
      });
    }
    if (phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
      rowIssues.push({
        rowNumber,
        severity: "ERROR",
        message: "El teléfono debe contener entre 10 y 15 dígitos.",
      });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      rowIssues.push({
        rowNumber,
        severity: "ERROR",
        message: "El correo principal no tiene un formato válido.",
      });
    }
    if (sourceName && !source) {
      rowIssues.push({
        rowNumber,
        severity: "ERROR",
        message: `La procedencia “${sourceName}” no está activa.`,
      });
    }
    if (preferenceText && !contactPreference) {
      rowIssues.push({
        rowNumber,
        severity: "ERROR",
        message:
          "Canal de contacto inválido. Usa Llamada, WhatsApp, Correo o Sin preferencia.",
      });
    }

    const customFields: Array<{ definitionId: string; value: unknown }> = [];
    for (const definition of activeDefinitions) {
      const rawValue = valueAt(row, customHeader(definition));
      const textValue = normalizeText(rawValue);
      if (!textValue && definition.type !== "BOOLEAN") {
        if (definition.required) {
          rowIssues.push({
            rowNumber,
            severity: "ERROR",
            message: `Completa ${definition.label}.`,
          });
        }
        continue;
      }

      let value: unknown = textValue;
      if (definition.type === "NUMBER") {
        const number = Number(textValue.replace(",", "."));
        if (!Number.isFinite(number)) {
          rowIssues.push({
            rowNumber,
            severity: "ERROR",
            message: `${definition.label} debe ser un número.`,
          });
          continue;
        }
        value = number;
      } else if (definition.type === "BOOLEAN") {
        const boolean = parseBoolean(rawValue);
        if (boolean === null) {
          if (definition.required || textValue) {
            rowIssues.push({
              rowNumber,
              severity: "ERROR",
              message: `${definition.label} debe ser Sí o No.`,
            });
          }
          continue;
        }
        value = boolean;
      } else if (
        definition.type === "DATE" &&
        textValue &&
        !/^\d{4}-\d{2}-\d{2}$/.test(textValue)
      ) {
        rowIssues.push({
          rowNumber,
          severity: "ERROR",
          message: `${definition.label} debe usar AAAA-MM-DD.`,
        });
        continue;
      } else if (
        definition.type === "SELECT" &&
        textValue &&
        !definition.options?.includes(textValue)
      ) {
        rowIssues.push({
          rowNumber,
          severity: "ERROR",
          message: `${definition.label} no coincide con una opción activa.`,
        });
        continue;
      }
      customFields.push({ definitionId: definition.id, value });
    }

    if (phoneDigits) {
      const previousRow = phoneRows.get(phoneDigits);
      if (previousRow) {
        rowIssues.push({
          rowNumber,
          severity: "ERROR",
          message: `El teléfono se repite en la fila ${previousRow}.`,
        });
      } else {
        phoneRows.set(phoneDigits, rowNumber);
      }
    }
    const normalizedName = normalizeKey(displayName);
    if (normalizedName) {
      const previousRow = nameRows.get(normalizedName);
      if (previousRow) {
        rowIssues.push({
          rowNumber,
          severity: "WARNING",
          message: `El nombre coincide con la fila ${previousRow}; revisa si es la misma persona.`,
        });
      } else {
        nameRows.set(normalizedName, rowNumber);
      }
    }

    issues.push(...rowIssues);
    rows.push({
      rowNumber,
      input: {
        displayName,
        phone: phoneDigits || null,
        email: email || null,
        sourceId: source?.id ?? null,
        notes: normalizeText(valueAt(row, baseHeaders[8])) || null,
        active: true,
        profile: {
          preferredName: normalizeText(valueAt(row, baseHeaders[5])) || null,
          preferredLocale: "es-MX",
          contactPreference: contactPreference ?? "WHATSAPP",
          notes: normalizeText(valueAt(row, baseHeaders[9])) || null,
        },
        aliases: splitList(valueAt(row, baseHeaders[7])),
        alternateEmails: splitList(valueAt(row, baseHeaders[3])),
        customFields,
      },
    });
  });

  if (!rows.length) {
    issues.push({
      rowNumber: 2,
      severity: "ERROR",
      message: "La hoja Clientes no contiene registros.",
    });
  }
  return { rows, issues };
}

export async function readSchedulerCustomerImportFile(
  file: File,
  definitions: SchedulerCustomerFieldDefinitionDto[],
  sources: SchedulerCustomerSourceDto[],
): Promise<SchedulerCustomerImportPreview> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: false,
  });
  const sheetName = workbook.SheetNames.includes("Clientes")
    ? "Clientes"
    : workbook.SheetNames[0];
  if (!sheetName) throw new Error("El archivo no contiene hojas.");
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("No fue posible leer la hoja Clientes.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    dateNF: "yyyy-mm-dd",
  });
  return parseSchedulerCustomerImportMatrix(matrix, definitions, sources);
}

export async function downloadSchedulerCustomerImportTemplate(input: {
  branchName: string;
  definitions: SchedulerCustomerFieldDefinitionDto[];
  sources: SchedulerCustomerSourceDto[];
}) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const headers = schedulerCustomerImportHeaders(input.definitions);
  const clients = XLSX.utils.aoa_to_sheet([headers]);
  clients["!cols"] = headers.map((header) => ({
    wch: Math.min(34, Math.max(16, header.length + 3)),
  }));
  clients["!autofilter"] = {
    ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1`,
  };
  const instructions = XLSX.utils.aoa_to_sheet([
    ["Plantilla de importación de clientes"],
    ["Sucursal destino", input.branchName],
    [
      "Uso",
      "Captura una persona por fila en la hoja Clientes. No cambies los encabezados.",
    ],
    ["Obligatorios", "Nombre completo y todas las columnas marcadas con *."],
    [
      "Teléfono",
      "Usa entre 10 y 15 dígitos. No repitas teléfonos dentro del archivo.",
    ],
    ["Fechas", "Usa el formato AAAA-MM-DD."],
    ["Listas", "Separa alias o correos alternos con coma o punto y coma."],
  ]);
  instructions["!cols"] = [{ wch: 22 }, { wch: 82 }];
  const catalogRows: unknown[][] = [
    ["Catálogo", "Valor"],
    ...input.sources
      .filter((source) => source.active)
      .map((source) => ["Procedencia", source.name]),
    ...["Llamada", "WhatsApp", "Correo", "Sin preferencia"].map((value) => [
      "Canal de contacto",
      value,
    ]),
    ...input.definitions
      .filter((definition) => definition.active && definition.options?.length)
      .flatMap((definition) =>
        definition.options!.map((option) => [definition.label, option]),
      ),
  ];
  const catalogs = XLSX.utils.aoa_to_sheet(catalogRows);
  catalogs["!cols"] = [{ wch: 28 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instrucciones");
  XLSX.utils.book_append_sheet(workbook, clients, "Clientes");
  XLSX.utils.book_append_sheet(workbook, catalogs, "Catálogos");
  XLSX.writeFile(workbook, "plantilla-importacion-clientes.xlsx", {
    compression: true,
  });
}
