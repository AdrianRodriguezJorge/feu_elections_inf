/**
 * Configuración dinámica del Proceso Electoral (F3).
 *
 * Los valores por defecto se derivan estrictamente del Reglamento de la FEU (ABC 2019):
 *  - Participación mínima requerida: >85 % (Art. 38).
 *  - Margen de escaños: N = candidatos - 2 (Art. 39 / RGF-08).
 *  - Mínimo de candidatos: 5 candidatos para N = 3 puestos (Art. 39).
 *  - Rango de miembros por brigada: 3 a 45 (Art. 3 / RGF-24).
 *
 * El Administrador puede ajustar estos parámetros por proceso en caso de
 * resoluciones de excepción aprobadas, evitando valores fijos ("hardcoded").
 */

export interface ProcessConfig {
  /** Porcentaje de participación electoral mínima requerida (defecto: 85 %). */
  minParticipationPercentage: number;
  /** Margen restado al total de candidatos para definir los escaños N (defecto: 2). */
  candidateSeatsMargin: number;
  /** Cantidad mínima de candidatos exigida para abrir el proceso (defecto: 5). */
  minCandidates: number;
  /** Cantidad mínima de miembros por brigada (defecto: 3). */
  minBrigadeSize: number;
  /** Cantidad máxima de miembros por brigada regular (defecto: 45). */
  maxBrigadeSize: number;
  /** Si se permite la anulación consciente de la boleta en 2 pasos (defecto: true). */
  allowVoluntaryAnnulment: boolean;
}

export const DEFAULT_PROCESS_CONFIG: Readonly<ProcessConfig> = Object.freeze({
  minParticipationPercentage: 85,
  candidateSeatsMargin: 2,
  minCandidates: 5,
  minBrigadeSize: 3,
  maxBrigadeSize: 45,
  allowVoluntaryAnnulment: true,
});

export interface ConfigValidationResult {
  valid: boolean;
  config: ProcessConfig;
  errors: string[];
}

/**
 * Valida y fusiona una configuración parcial con los valores por defecto reglamentarios.
 */
export function resolveProcessConfig(custom?: Partial<ProcessConfig>): ConfigValidationResult {
  const errors: string[] = [];
  const merged: ProcessConfig = {
    minParticipationPercentage:
      custom?.minParticipationPercentage ?? DEFAULT_PROCESS_CONFIG.minParticipationPercentage,
    candidateSeatsMargin:
      custom?.candidateSeatsMargin ?? DEFAULT_PROCESS_CONFIG.candidateSeatsMargin,
    minCandidates: custom?.minCandidates ?? DEFAULT_PROCESS_CONFIG.minCandidates,
    minBrigadeSize: custom?.minBrigadeSize ?? DEFAULT_PROCESS_CONFIG.minBrigadeSize,
    maxBrigadeSize: custom?.maxBrigadeSize ?? DEFAULT_PROCESS_CONFIG.maxBrigadeSize,
    allowVoluntaryAnnulment:
      custom?.allowVoluntaryAnnulment ?? DEFAULT_PROCESS_CONFIG.allowVoluntaryAnnulment,
  };

  if (merged.minParticipationPercentage <= 0 || merged.minParticipationPercentage > 100) {
    errors.push("El porcentaje de participación mínima requerida debe estar entre 1 y 100.");
  }
  if (merged.candidateSeatsMargin < 1) {
    errors.push("El margen de escaños debe ser al menos 1.");
  }
  if (merged.minCandidates <= merged.candidateSeatsMargin) {
    errors.push(
      `El mínimo de candidatos (${merged.minCandidates}) debe ser mayor al margen de escaños (${merged.candidateSeatsMargin}) para elegir al menos 1 miembro.`,
    );
  }
  if (merged.minBrigadeSize < 1) {
    errors.push("El tamaño mínimo de brigada debe ser al menos 1.");
  }
  if (merged.maxBrigadeSize < merged.minBrigadeSize) {
    errors.push("El tamaño máximo de brigada no puede ser menor que el tamaño mínimo.");
  }

  return {
    valid: errors.length === 0,
    config: merged,
    errors,
  };
}

/**
 * Calcula la cantidad exacta de votantes requerida para cumplir el umbral de participación (> % estricto).
 *
 * Según el Art. 38 del ABC de la FEU: "más del 85 %", es decir, estrictamente mayor.
 *
 * @param totalEligible total de electores habilitados en el padrón
 * @param minPct porcentaje mínimo exigido (defecto: 85)
 */
export function calculateRequiredVotes(totalEligible: number, minPct: number = 85): number {
  if (totalEligible <= 0) return 0;
  // Estrictamente mayor que el porcentaje
  return Math.floor((totalEligible * minPct) / 100) + 1;
}

export interface ParticipationProgress {
  /** Total de electores habilitados en el padrón. */
  totalEligible: number;
  /** Total de boletas depositadas (válidas + anuladas conscientemente). */
  currentVotes: number;
  /** Porcentaje de participación actual con 2 decimales. */
  currentPercentage: number;
  /** Cantidad mínima de votantes necesaria para validar la elección (> minPct). */
  requiredVotes: number;
  /** Votos que faltan para alcanzar la participación requerida (0 si ya se cumplió). */
  remainingVotes: number;
  /** Si ya se alcanzó la participación requerida. */
  requirementMet: boolean;
}

/**
 * Calcula el estado de avance de la participación electoral en tiempo real.
 *
 * @param validVotes boletas válidas emitidas
 * @param annulledVotes boletas deliberadamente anuladas por el elector
 * @param totalEligible total de electores registrados en el padrón
 * @param minPct porcentaje requerido (por defecto 85 %)
 */
export function calculateParticipationProgress(
  validVotes: number,
  annulledVotes: number,
  totalEligible: number,
  minPct: number = 85,
): ParticipationProgress {
  if (totalEligible <= 0) {
    return {
      totalEligible: 0,
      currentVotes: 0,
      currentPercentage: 0,
      requiredVotes: 0,
      remainingVotes: 0,
      requirementMet: false,
    };
  }

  const currentVotes = validVotes + annulledVotes;
  const currentPercentage = Math.round((currentVotes / totalEligible) * 10000) / 100;
  const requiredVotes = calculateRequiredVotes(totalEligible, minPct);
  const remainingVotes = Math.max(0, requiredVotes - currentVotes);
  const requirementMet = currentVotes >= requiredVotes;

  return {
    totalEligible,
    currentVotes,
    currentPercentage,
    requiredVotes,
    remainingVotes,
    requirementMet,
  };
}

