/**
 * Derivación de los puestos del Secretariado.
 *
 * Art. 59: la lista de candidatos tiene `N + 2` integrantes, donde `N` es la
 * cantidad de puestos a elegir. Por tanto `N = candidatos - 2`.
 *
 * Regla dura (docs/migracion-web/09 §3): `N` NO es un parámetro editable.
 * Cambia la lista, cambia `N`. Si se cargan 11 candidatos, hay 9 puestos.
 */

import type { ProcessRules } from "./types";

/** Candidatos adicionales a los electos (Art. 59). */
export const EXTRA_CANDIDATES = 2;

/**
 * Mínimo de puestos para que la composición tenga sentido:
 * presidente + vicepresidente + al menos un miembro.
 */
export const MIN_SEATS = 3;

/**
 * Deriva los puestos a elegir a partir de la cantidad de candidatos cargados.
 *
 * @param candidateCount cantidad de candidatos de la lista
 * @returns los puestos a elegir
 */
export function deriveSeats(candidateCount: number): number {
  if (!Number.isInteger(candidateCount) || candidateCount < 0) {
    throw new RangeError(
      `La cantidad de candidatos debe ser un entero no negativo; se recibió ${candidateCount}.`,
    );
  }
  return candidateCount - EXTRA_CANDIDATES;
}

/** Candidatos mínimos para poder abrir el proceso. */
export const MIN_CANDIDATES = MIN_SEATS + EXTRA_CANDIDATES;

/**
 * Comprueba si una lista de candidatos permite abrir el proceso.
 *
 * @param candidateCount cantidad de candidatos de la lista
 * @returns `ok: true` si se puede abrir; en caso contrario, el motivo
 */
export function canOpenProcess(
  candidateCount: number,
): { ok: true; seats: number } | { ok: false; reason: string } {
  if (candidateCount < MIN_CANDIDATES) {
    return {
      ok: false,
      reason: `Se necesitan al menos ${MIN_CANDIDATES} candidatos (${MIN_SEATS} puestos). Hay ${candidateCount}.`,
    };
  }
  return { ok: true, seats: deriveSeats(candidateCount) };
}

/**
 * Construye las reglas del proceso a partir de lo que la configuración permite
 * variar. `maxMemberMarks` siempre deriva de los puestos, nunca se fija a mano.
 *
 * @param candidateCount cantidad de candidatos de la lista
 * @param overrides valores configurables del proceso
 */
export function buildProcessRules(
  candidateCount: number,
  overrides: Partial<
    Pick<
      ProcessRules,
      | "level"
      | "proposalSlots"
      | "votingMode"
      | "quorumPct"
      | "quorumExceptionPct"
      | "quorumExceptionScope"
      | "majorityRule"
      | "tieRule"
      | "columns"
      | "vicePresident"
      | "vacancy"
    >
  > = {},
): ProcessRules {
  const seats = deriveSeats(candidateCount);
  return {
    level: overrides.level ?? "FACULTAD",
    seatsRule: "CANDIDATES_MINUS_TWO",
    extraCandidates: EXTRA_CANDIDATES,
    proposalSlots: overrides.proposalSlots ?? 0,
    votingMode: overrides.votingMode ?? "SECRET",
    minMemberMarks: 1,
    maxMemberMarks: seats,
    presidentMarks: 1,
    quorumPct: overrides.quorumPct ?? 85,
    ...(overrides.quorumExceptionPct !== undefined
      ? { quorumExceptionPct: overrides.quorumExceptionPct }
      : {}),
    ...(overrides.quorumExceptionScope !== undefined
      ? { quorumExceptionScope: overrides.quorumExceptionScope }
      : {}),
    majorityRule: overrides.majorityRule ?? "TOP_N",
    tieRule: overrides.tieRule ?? "PRESIDENT_VOTES_THEN_RUNOFF",
    columns: overrides.columns ?? ["NAME", "BRIGADE", "MEMBER", "PRESIDENT"],
    vicePresident: overrides.vicePresident ?? "POST_TALLY_FROM_ELECTED",
    vacancy: overrides.vacancy ?? "VP_SUCCEEDS",
  };
}
