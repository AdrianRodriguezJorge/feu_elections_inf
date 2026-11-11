/**
 * Quórum y participación.
 *
 * Art. 38: la elección es válida con **más del 85 %** de sufragio. El 80 %
 * excepcional es exclusivo del nivel de universidad (Art. 38), con consulta
 * al Secretariado Nacional; en Facultad no aplica.
 *
 * Quién cuenta (INV-16): todo el que emitió una boleta, sea válida o anulada.
 * Solo **no cuenta** quien no emitió boleta (abstención).
 * Qué cuenta como voto: **solo las boletas válidas**. Las anuladas suman a la
 * participación y al quórum, pero no a ningún candidato.
 */

export interface QuorumInput {
  /** Boletas válidas: son las únicas que suman votos. */
  validBallots: number;
  /** Boletas anuladas por el elector: cuentan participación, no votos. */
  annulledBallots: number;
  /** Membresía habilitada: la base del cálculo. */
  eligibleMembers: number;
  /** Porcentaje de quórum exigido, sin el signo (85 = 85 %). */
  quorumPct: number;
}

export interface QuorumResult {
  /** Número de votantes (válidas + anuladas). */
  participations: number;
  /** Participación en porcentaje. */
  participationPct: number;
  /** Si se alcanzó el quórum. */
  quorumMet: boolean;
}

/**
 * Calcula la participación y el cumplimiento del quórum.
 *
 * @param input conteos del escrutinio y base de la membresía
 */
export function computeQuorum(input: QuorumInput): QuorumResult {
  const { validBallots, annulledBallots, eligibleMembers, quorumPct } = input;

  if (eligibleMembers <= 0) {
    return { participations: 0, participationPct: 0, quorumMet: false };
  }

  const participations = validBallots + annulledBallots;
  const participationPct = (participations / eligibleMembers) * 100;

  return {
    participations,
    participationPct: round2(participationPct),
    // «más del 85 %»: es estrictamente mayor, no mayor o igual.
    quorumMet: participationPct > quorumPct,
  };
}

/**
 * Indica si aplica la excepción del 80 %. Solo a nivel de universidad, con
 * aprobación del Secretariado Nacional (Art. 38).
 *
 * @param level nivel del proceso
 * @param quorumMet si se alcanzó el quórum principal
 * @param quorumExceptionPct porcentaje excepcional, si existe
 * @param approved por el Secretariado Nacional
 */
export function quorumExceptionApplies(
  level: "BRIGADA" | "FACULTAD" | "CENTRO" | "NACIONAL",
  quorumMet: boolean,
  quorumExceptionPct: number | undefined,
  approved: boolean,
): boolean {
  if (quorumMet) return true;
  if (level !== "CENTRO") return false;
  if (quorumExceptionPct === undefined) return false;
  return approved;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
