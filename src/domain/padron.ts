/**
 * Dominio puro para la gestión e importación del padrón electoral.
 *
 * Art. 3 / RGF-24: la brigada cuenta con 3 y hasta 45 miembros (salvo excepción).
 * RGF-34 / EF-22 / EF-23:
 *  - La importación se valida contra la plantilla oficial.
 *  - Las brigadas deben existir previamente en la estructura.
 *  - Validación estricta por fila con informe detallado (fila, columna, mensaje).
 *  - Detección de duplicados internos y externos.
 */

import { validateCI } from "./ci";
import { calculateRequiredVotes } from "./config";

export const MIN_BRIGADE_SIZE = 3;
export const MAX_BRIGADE_SIZE = 45;

/** Encabezados canónicos de la plantilla oficial (basados en el XLS real de la Facultad). */
export const OFFICIAL_HEADERS = [
  "Carnet de Identidad (CI)",
  "Nombre",
  "1er. Apellido",
  "2do. Apellido",
  "Brigada",
] as const;

export interface PadronRecord {
  ci: string;
  firstName: string;
  firstSurname: string;
  secondSurname: string | null;
  fullName: string;
  brigadeCode: string;
}

export interface ParsePadronOptions {
  /**
   * - strict: si un CI ya existe en el padrón, se reporta como error CI_ALREADY_EXISTS.
   * - incremental: si un CI ya existe, se omite silenciosamente y solo se importan los nuevos (merge).
   */
  mode?: "strict" | "incremental";
}

export interface IncrementalImportResult {
  ok: boolean;
  totalRows: number;
  recordsToAdd: PadronRecord[];
  alreadyExistingCount: number;
  alreadyExistingCIs: string[];
  errors: RowError[];
  brigadeCounts: Record<string, number>;
  totalEligibleAfter: number;
  minVotesRequired: number;
}

export interface RowError {
  rowNumber: number;
  field?: string;
  message: string;
  code:
    | "HEADER_INVALID"
    | "FIELD_REQUIRED"
    | "CI_INVALID"
    | "CI_DUPLICATE_IN_FILE"
    | "CI_ALREADY_EXISTS"
    | "BRIGADE_NOT_FOUND"
    | "ROW_MALFORMED";
}

export interface BrigadeValidationResult {
  valid: boolean;
  code: string;
  memberCount: number;
  warning?: string;
}

export interface ParsePadronResult {
  ok: boolean;
  totalRows: number;
  validRows: PadronRecord[];
  errors: RowError[];
  brigadeCounts: Record<string, number>;
}

/**
 * Valida si el tamaño de una brigada cumple el rango legal (Art. 3 / RGF-24).
 *
 * @param code código de la brigada
 * @param count cantidad de miembros en la brigada
 */
export function validateBrigadeSize(code: string, count: number): BrigadeValidationResult {
  if (count < MIN_BRIGADE_SIZE) {
    return {
      valid: false,
      code,
      memberCount: count,
      warning: `La brigada ${code} tiene ${count} miembros (mínimo legal: ${MIN_BRIGADE_SIZE}).`,
    };
  }
  if (count > MAX_BRIGADE_SIZE) {
    return {
      valid: false,
      code,
      memberCount: count,
      warning: `La brigada ${code} tiene ${count} miembros (máximo legal regular: ${MAX_BRIGADE_SIZE}). Requiere excepción aprobada por Consejo.`,
    };
  }
  return { valid: true, code, memberCount: count };
}

/**
 * Normaliza nombres de encabezados para comparar tolerando pequeñas variaciones.
 */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Genera el contenido de la plantilla CSV oficial descargable.
 */
export function generatePadronTemplateCSV(): string {
  const headerLine = OFFICIAL_HEADERS.join(",");
  const sampleRow1 = "03080468489,Adán,Adán,Cabrera,41";
  const sampleRow2 = "02052981315,Roxana,Almaguer,Sosa,41";
  return `${headerLine}\n${sampleRow1}\n${sampleRow2}\n`;
}

/**
 * Parsea y valida el contenido de un archivo CSV de padrón.
 *
 * @param csvContent contenido del archivo CSV
 * @param existingBrigadeCodes lista de códigos de brigadas preexistentes en la base
 * @param existingMemberCIs conjunto de CIs ya registradas previamente en la estructura
 */
export function parseAndValidatePadronCSV(
  csvContent: string,
  existingBrigadeCodes: readonly string[],
  existingMemberCIs: ReadonlySet<string> = new Set(),
  options: ParsePadronOptions = { mode: "strict" },
): ParsePadronResult {
  const errors: RowError[] = [];
  const validRows: PadronRecord[] = [];
  const brigadeCounts: Record<string, number> = {};
  const seenCisInBatch = new Set<string>();
  const knownBrigades = new Set(existingBrigadeCodes.map((c) => c.trim()));
  const isIncremental = options.mode === "incremental";

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      totalRows: 0,
      validRows: [],
      errors: [
        {
          rowNumber: 1,
          code: "HEADER_INVALID",
          message: "El archivo está vacío.",
        },
      ],
      brigadeCounts: {},
    };
  }

  // Detectar delimitador en cabecera: coma, punto y coma o tabulador
  const headerLine = lines[0] ?? "";
  const delimiter = headerLine.includes(";")
    ? ";"
    : headerLine.includes("\t")
      ? "\t"
      : ",";

  const rawHeaders = headerLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // Buscar índices requeridos
  const ciIndex = normalizedHeaders.findIndex((h) => h.includes("ci") || h.includes("carnet"));
  const nombreIndex = normalizedHeaders.findIndex(
    (h) => h === "nombre" || h === "nombres" || h === "firstname",
  );
  const ape1Index = normalizedHeaders.findIndex(
    (h) => h.includes("1er") || h.includes("primer") || h === "apellido" || h === "apellidos",
  );
  const ape2Index = normalizedHeaders.findIndex(
    (h) => h.includes("2do") || h.includes("segundo"),
  );
  const brigadaIndex = normalizedHeaders.findIndex(
    (h) => h.includes("brigada") || h.includes("grupo"),
  );

  if (ciIndex === -1 || nombreIndex === -1 || ape1Index === -1 || brigadaIndex === -1) {
    errors.push({
      rowNumber: 1,
      code: "HEADER_INVALID",
      message: `La cabecera no contiene las columnas requeridas (${OFFICIAL_HEADERS.join(", ")}).`,
    });
    return {
      ok: false,
      totalRows: lines.length - 1,
      validRows: [],
      errors,
      brigadeCounts: {},
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const line = lines[i];
    if (!line) continue;

    const cols = line
      .split(delimiter)
      .map((c) => c.trim().replace(/^"|"$/g, ""));

    if (cols.length < 4) {
      errors.push({
        rowNumber,
        code: "ROW_MALFORMED",
        message: `Fila incompleta: se esperaban al menos 4 columnas y se recibieron ${cols.length}.`,
      });
      continue;
    }

    const rawCi = cols[ciIndex] ?? "";
    const rawNombre = cols[nombreIndex] ?? "";
    const rawApe1 = cols[ape1Index] ?? "";
    const rawApe2 = ape2Index !== -1 ? (cols[ape2Index] ?? "") : "";
    const rawBrigada = cols[brigadaIndex] ?? "";

    let hasRowError = false;

    // 1. Validar campos requeridos
    if (!rawCi) {
      errors.push({ rowNumber, field: "Carnet de Identidad", message: "El CI es obligatorio.", code: "FIELD_REQUIRED" });
      hasRowError = true;
    }
    if (!rawNombre) {
      errors.push({ rowNumber, field: "Nombre", message: "El nombre es obligatorio.", code: "FIELD_REQUIRED" });
      hasRowError = true;
    }
    if (!rawApe1) {
      errors.push({ rowNumber, field: "1er. Apellido", message: "El primer apellido es obligatorio.", code: "FIELD_REQUIRED" });
      hasRowError = true;
    }
    if (!rawBrigada) {
      errors.push({ rowNumber, field: "Brigada", message: "La brigada es obligatoria.", code: "FIELD_REQUIRED" });
      hasRowError = true;
    }

    // 2. Validar CI
    if (rawCi) {
      const ciValidation = validateCI(rawCi);
      if (!ciValidation.valid) {
        errors.push({ rowNumber, field: "Carnet de Identidad", message: ciValidation.error ?? "CI inválido", code: "CI_INVALID" });
        hasRowError = true;
      } else {
        const cleanCi = ciValidation.data!.ci;

        // Duplicado en el mismo lote
        if (seenCisInBatch.has(cleanCi)) {
          errors.push({
            rowNumber,
            field: "Carnet de Identidad",
            message: `El CI ${cleanCi} aparece más de una vez en este archivo.`,
            code: "CI_DUPLICATE_IN_FILE",
          });
          hasRowError = true;
        }

        // Ya existe en la membresía
        if (existingMemberCIs.has(cleanCi)) {
          if (!isIncremental) {
            errors.push({
              rowNumber,
              field: "Carnet de Identidad",
              message: `El CI ${cleanCi} ya está registrado en la membresía de la estructura.`,
              code: "CI_ALREADY_EXISTS",
            });
            hasRowError = true;
          } else {
            // En modo incremental se omite silenciosamente sin marcar error
            continue;
          }
        }

        seenCisInBatch.add(cleanCi);
      }
    }

    // 3. Validar que la brigada exista previamente (RGF-34 / EF-23)
    if (rawBrigada && !knownBrigades.has(rawBrigada)) {
      errors.push({
        rowNumber,
        field: "Brigada",
        message: `La brigada "${rawBrigada}" no existe en el sistema. Debe crearse antes de importar (RGF-34).`,
        code: "BRIGADE_NOT_FOUND",
      });
      hasRowError = true;
    }

    if (!hasRowError) {
      const secondSurname = rawApe2 ? rawApe2 : null;
      const fullName = [rawNombre, rawApe1, secondSurname].filter(Boolean).join(" ");
      const record: PadronRecord = {
        ci: rawCi,
        firstName: rawNombre,
        firstSurname: rawApe1,
        secondSurname,
        fullName,
        brigadeCode: rawBrigada,
      };
      validRows.push(record);
      brigadeCounts[rawBrigada] = (brigadeCounts[rawBrigada] ?? 0) + 1;
    }
  }

  return {
    ok: errors.length === 0,
    totalRows: lines.length - 1,
    validRows,
    errors,
    brigadeCounts,
  };
}

/**
 * Importación incremental del padrón (merge por CI):
 *  - Deduplica contra registros ya existentes sin abortar el lote.
 *  - Importa únicamente los miembros nuevos que no estaban en la estructura.
 *  - Calcula el nuevo total de electores y el umbral de participación mínima en tiempo real.
 *
 * @param csvContent contenido del archivo CSV o Excel exportado
 * @param existingBrigadeCodes códigos de brigadas registrados en el sistema
 * @param existingMemberCIs CIs de estudiantes ya existentes en la base
 * @param minParticipationPercentage umbral porcentual configurable (defecto: 85 %)
 */
export function importPadronIncremental(
  csvContent: string,
  existingBrigadeCodes: readonly string[],
  existingMemberCIs: ReadonlySet<string> = new Set(),
  minParticipationPercentage: number = 85,
): IncrementalImportResult {
  const parseResult = parseAndValidatePadronCSV(
    csvContent,
    existingBrigadeCodes,
    existingMemberCIs,
    { mode: "incremental" },
  );

  // Determinar cuáles de los CIs del archivo ya existían
  const alreadyExistingCIs: string[] = [];
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Revisar CIs válidos existentes para informe detallado
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]?.split(/[,;\t]/) ?? [];
    const ciCandidate = cols[0]?.trim().replace(/^"|"$/g, "") ?? "";
    const validated = validateCI(ciCandidate);
    if (validated.valid && existingMemberCIs.has(validated.data!.ci)) {
      if (!alreadyExistingCIs.includes(validated.data!.ci)) {
        alreadyExistingCIs.push(validated.data!.ci);
      }
    }
  }

  const totalEligibleAfter = existingMemberCIs.size + parseResult.validRows.length;
  const minVotesRequired = calculateRequiredVotes(
    totalEligibleAfter,
    minParticipationPercentage,
  );

  return {
    ok: parseResult.ok,
    totalRows: parseResult.totalRows,
    recordsToAdd: parseResult.validRows,
    alreadyExistingCount: alreadyExistingCIs.length,
    alreadyExistingCIs,
    errors: parseResult.errors,
    brigadeCounts: parseResult.brigadeCounts,
    totalEligibleAfter,
    minVotesRequired,
  };
}
