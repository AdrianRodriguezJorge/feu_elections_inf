/**
 * Dominio puro de Candidaturas, Ordenación de Boleta y Biografías (F3).
 *
 * Art. 59 / RGF-08 / RGF-09 / INV-09:
 *  - Boleta ordenada alfabéticamente por primer apellido (con locale español).
 *  - N = candidatos - 2; mínimo 5 candidatos (3 puestos).
 *  - Posición de boleta única, fija e inmutable tras la apertura.
 *
 * Art. 39, 42 / RGF-05, RGF-06 / EF-04:
 *  - Validación por brigada y aprobación del Consejo son referenciales y no bloquean.
 *
 * INV-17 / EF-24:
 *  - Biografía en Markdown (.md) sanitizada contra inyección XSS y versionada con hash SHA-256.
 */

import { createHash } from "node:crypto";
import { validateCI } from "./ci";
import { canOpenProcess, deriveSeats } from "./seats";

export interface CandidateInput {
  id: string;
  studentId: string;
  firstSurname: string;
  secondSurname?: string | null | undefined;
  name: string;
  ci: string;
  brigadeCode: string;
  year?: number | null | undefined;
  biographyMd?: string | null | undefined;
  brigadeValidated?: boolean | undefined;
  councilApproved?: boolean | undefined;
}

export interface ProcessCandidateSnapshot {
  candidateId: string;
  studentId: string;
  ballotPosition: number;
  fullName: string;
  firstSurname: string;
  secondSurname: string | null;
  name: string;
  ci: string;
  brigadeCode: string;
  biographyMd?: string | null;
  biographyHash?: string | null;
  brigadeValidated: boolean;
  councilApproved: boolean;
}

export interface CandidacyValidationOutcome {
  valid: boolean;
  seats: number;
  candidatesCount: number;
  snapshot: ProcessCandidateSnapshot[];
  candidacyHash: string;
  errors: string[];
}

/**
 * Sanitiza texto en Markdown eliminando etiquetas ejecutables, scripts y atributos peligrosos (INV-17).
 *
 * @param rawMd contenido crudo en Markdown
 */
export function sanitizeBiographyMd(rawMd: string | null | undefined): {
  sanitized: string | null;
  hash: string | null;
} {
  if (!rawMd || rawMd.trim().length === 0) {
    return { sanitized: null, hash: null };
  }

  // 1. Eliminar etiquetas de script, iframe, object, embed, style, form
  let clean = rawMd
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "");

  // 2. Eliminar manejadores de eventos (onclick, onload, onerror, etc.)
  clean = clean.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  clean = clean.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");

  // 3. Neutralizar protocolos javascript: y vbscript: en enlaces
  clean = clean.replace(/javascript\s*:/gi, "blocked-javascript:");
  clean = clean.replace(/vbscript\s*:/gi, "blocked-vbscript:");

  const hash = createHash("sha256").update(clean, "utf8").digest("hex");
  return { sanitized: clean, hash };
}

/**
 * Ordena alfabéticamente los candidatos por primer apellido respetando locale español y acentos (Art. 59 / RGF-09 / EF-16).
 *
 * @param candidates lista de candidatos sin ordenar
 */
export function sortCandidatesForBallot(candidates: readonly CandidateInput[]): CandidateInput[] {
  return [...candidates].sort((a, b) => {
    // 1. Primer apellido (con sensibilidad a acentos si difieren)
    const cmpSurname1 = a.firstSurname.localeCompare(b.firstSurname, "es", {
      sensitivity: "case",
    });
    if (cmpSurname1 !== 0) return cmpSurname1;

    // 2. Segundo apellido
    const ape2A = a.secondSurname ?? "";
    const ape2B = b.secondSurname ?? "";
    const cmpSurname2 = ape2A.localeCompare(ape2B, "es", { sensitivity: "case" });
    if (cmpSurname2 !== 0) return cmpSurname2;

    // 3. Nombre
    const cmpName = a.name.localeCompare(b.name, "es", { sensitivity: "case" });
    if (cmpName !== 0) return cmpName;

    // 4. Desempate determinista por CI
    return a.ci.localeCompare(b.ci);
  });
}

/**
 * Valida y construye el snapshot congelado de la candidatura para la boleta (F3).
 *
 * @param candidates lista de candidatos a postular
 */
export function buildCandidacySnapshot(
  candidates: readonly CandidateInput[],
): CandidacyValidationOutcome {
  const errors: string[] = [];

  // 1. Validar mínimo de candidatos (EF-01, EF-02, EF-03)
  const openCheck = canOpenProcess(candidates.length);
  if (!openCheck.ok) {
    errors.push(openCheck.reason);
  }

  // 2. Validar CIs y detectar duplicados
  const seenCis = new Set<string>();
  for (const c of candidates) {
    const ciVal = validateCI(c.ci);
    if (!ciVal.valid) {
      errors.push(`Candidato ${c.name} ${c.firstSurname}: ${ciVal.error}`);
    } else {
      if (seenCis.has(ciVal.data!.ci)) {
        errors.push(`El CI ${ciVal.data!.ci} está repetido en la lista de candidatos.`);
      }
      seenCis.add(ciVal.data!.ci);
    }
  }

  // 3. Ordenar alfabéticamente y generar posiciones inmutables
  const sorted = sortCandidatesForBallot(candidates);
  const snapshot: ProcessCandidateSnapshot[] = sorted.map((c, index) => {
    const { sanitized, hash } = sanitizeBiographyMd(c.biographyMd);
    const fullName = [c.name, c.firstSurname, c.secondSurname].filter(Boolean).join(" ");

    return {
      candidateId: c.id,
      studentId: c.studentId,
      ballotPosition: index + 1, // 1-based
      fullName,
      firstSurname: c.firstSurname,
      secondSurname: c.secondSurname ?? null,
      name: c.name,
      ci: c.ci,
      brigadeCode: c.brigadeCode,
      biographyMd: sanitized,
      biographyHash: hash,
      brigadeValidated: c.brigadeValidated ?? false,
      councilApproved: c.councilApproved ?? false,
    };
  });

  // 4. Hash criptográfico de la candidatura completa
  const snapshotPayload = JSON.stringify(
    snapshot.map((s) => ({
      pos: s.ballotPosition,
      ci: s.ci,
      name: s.fullName,
      brigade: s.brigadeCode,
    })),
  );
  const candidacyHash = createHash("sha256").update(snapshotPayload, "utf8").digest("hex");

  const seats = candidates.length >= 2 ? deriveSeats(candidates.length) : 0;

  return {
    valid: errors.length === 0,
    seats,
    candidatesCount: candidates.length,
    snapshot,
    candidacyHash,
    errors,
  };
}
