/**
 * Escrutinio.
 *
 * Art. 63: son miembros los candidatos con mayor cantidad de votos para
 * miembro; de los electos, presidente el que tiene más votos para presidente.
 *
 * Art. 40: empate para miembro se resuelve comparando los votos de presidente;
 * empate para presidente exige **nueva votación** entre los implicados.
 *
 * Prohibido (Art. 40): desempatar por orden alfabético, por posición de lista o
 * por identificador. El orden alfabético solo define la **boleta**, nunca el
 * resultado. Por eso este módulo devuelve los empates en vez de resolverlos.
 *
 * El escrutinio es puro: los mismos datos de entrada producen siempre la misma
 * salida (INV-08). El conteo se hace sobre `process_candidate_id`, nunca por
 * posición (INV-10).
 */

import type { BallotSelection } from "./types";

export interface TallyBallot {
  selections: readonly BallotSelection[];
}

export interface CandidateTotal {
  candidateId: string;
  memberVotes: number;
  presidentVotes: number;
}

export type TieType = "CUT" | "PRESIDENT";

export interface TallyTie {
  type: TieType;
  /** Candidatos implicados en el empate. */
  candidateIds: string[];
}

export interface TallyResult {
  /** Totales por candidato, ordenados como en la boleta (orden estable). */
  totals: CandidateTotal[];
  /** Candidatos electos, en orden de votes. */
  elected: string[];
  /** Presidente, si se pudo determinar sin empate. */
  presidentId: string | null;
  /** Empate detectado, si lo hay. Lo resuelve la Comisión (decisión F2). */
  tie: TallyTie | null;
  /** Decisión de la Comisión que resolvió un empate, si la hubo. */
  resolution?: TieResolutionRecord;
}

/** Registro de la decisión de la Comisión sobre un empate. */
export interface TieResolutionRecord {
  type: TieType;
  tiedIds: string[];
  chosenIds: string[];
  presidentId: string;
}

/**
 * Cuenta los votos y determina electos y presidente.
 *
 * @param ballots boletas **válidas**; las anuladas no entran (INV-16)
 * @param candidateIds candidatos de la lista, en orden de boleta
 * @param seats puestos a elegir
 */
export function tally(
  ballots: readonly TallyBallot[],
  candidateIds: readonly string[],
  seats: number,
): TallyResult {
  const memberVotes = new Map<string, number>();
  const presidentVotes = new Map<string, number>();
  for (const id of candidateIds) {
    memberVotes.set(id, 0);
    presidentVotes.set(id, 0);
  }

  for (const ballot of ballots) {
    const countedMember = new Set<string>();
    const countedPresident = new Set<string>();
    for (const selection of ballot.selections) {
      if (!memberVotes.has(selection.processCandidateId)) continue;
      if (selection.member && !countedMember.has(selection.processCandidateId)) {
        countedMember.add(selection.processCandidateId);
        memberVotes.set(
          selection.processCandidateId,
          (memberVotes.get(selection.processCandidateId) ?? 0) + 1,
        );
      }
      if (selection.president && !countedPresident.has(selection.processCandidateId)) {
        countedPresident.add(selection.processCandidateId);
        presidentVotes.set(
          selection.processCandidateId,
          (presidentVotes.get(selection.processCandidateId) ?? 0) + 1,
        );
      }
    }
  }

  // Orden de conteo: votos de miembro y luego de presidente, ambos descendentes.
  // El desempate técnico solo ordena la presentación; no decide el corte.
  const order = new Map(candidateIds.map((id, index) => [id, index]));
  const totals: CandidateTotal[] = candidateIds
    .map((candidateId) => ({
      candidateId,
      memberVotes: memberVotes.get(candidateId) ?? 0,
      presidentVotes: presidentVotes.get(candidateId) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.memberVotes - a.memberVotes ||
        b.presidentVotes - a.presidentVotes ||
        (order.get(a.candidateId) ?? 0) - (order.get(b.candidateId) ?? 0),
    );

  const elected = totals.slice(0, seats).map((t) => t.candidateId);

  // Empate en el corte: el último electo y el siguiente empatan en votos de
  // miembro. Se compara por votos de presidente; si persiste, hay balotaje.
  const lastElected = totals[seats - 1];
  const firstNotElected = totals[seats];
  if (
    lastElected &&
    firstNotElected &&
    // También a cero votos: el orden de boleta (alfabético) nunca decide (Art. 40).
    lastElected.memberVotes === firstNotElected.memberVotes
  ) {
    if (lastElected.presidentVotes > firstNotElected.presidentVotes) {
      // Se resuelve con los votos de presidente (Art. 40): el último electo
      // supera al primer no electo en votos de presidente.
      return finalize(totals, elected, order);
    }

    // Si persiste el empate en votos de presidente en la frontera del corte,
    // todos los candidatos con iguales votos de miembro y presidente van a balotaje.
    const tiedCandidates = totals
      .filter(
        (t) =>
          t.memberVotes === lastElected.memberVotes &&
          t.presidentVotes === lastElected.presidentVotes,
      )
      .map((t) => t.candidateId);

    return {
      totals,
      elected: [],
      presidentId: null,
      tie: {
        type: "CUT",
        candidateIds: tiedCandidates,
      },
    };
  }

  return finalize(totals, elected, order);
}

/**
 * Elige al presidente entre los electos y detecta empate de presidencia.
 *
 * @param totals totales ordenados
 * @param elected electos
 * @param order mapa de orden de boleta
 */
function finalize(
  totals: CandidateTotal[],
  elected: string[],
  order: Map<string, number>,
): TallyResult {
  const electedTotals = totals.filter((t) => elected.includes(t.candidateId));
  const maxPresidentVotes = electedTotals.reduce(
    (max, t) => Math.max(max, t.presidentVotes),
    -1,
  );
  const presidentCandidates = electedTotals
    .filter((t) => t.presidentVotes === maxPresidentVotes)
    .sort(
      (a, b) => (order.get(a.candidateId) ?? 0) - (order.get(b.candidateId) ?? 0),
    );

  if (presidentCandidates.length > 1) {
    return {
      totals,
      elected,
      presidentId: null,
      tie: {
        type: "PRESIDENT",
        candidateIds: presidentCandidates.map((c) => c.candidateId),
      },
    };
  }

  return {
    totals,
    elected,
    presidentId: presidentCandidates[0]?.candidateId ?? null,
    tie: null,
  };
}

/**
 * Recomienda al vicepresidente: el electo con más votos de miembro que no sea
 * presidente (Q-L13). La Comisión puede elegir a otro electo.
 *
 * @param result resultado del escrutinio
 */
export function recommendVicePresident(result: TallyResult): string | null {
  const pool = result.totals.filter(
    (t) => result.elected.includes(t.candidateId) && t.candidateId !== result.presidentId,
  );
  if (pool.length === 0) return null;
  const max = pool.reduce((m, t) => Math.max(m, t.memberVotes), -1);
  const best = pool
    .filter((t) => t.memberVotes === max)
    .sort((a, b) => b.presidentVotes - a.presidentVotes);
  return best[0]?.candidateId ?? null;
}

/**
 * Recomenda al sucesor cuando el presidente dimite o es separado (Q-L14).
 * Por defecto asume el vicepresidente; si ya no es posible, el siguiente
 * electo con más votos. La Comisión puede elegir a otro electo.
 *
 * @param result resultado del escrutinio
 * @param currentVicePresidentId vicepresidente vigente, si lo hay
 */
export function recommendSuccessor(
  result: TallyResult,
  currentVicePresidentId: string | null,
): string | null {
  if (currentVicePresidentId && result.elected.includes(currentVicePresidentId)) {
    return currentVicePresidentId;
  }
  return recommendVicePresident(result);
}

export interface TieChoice {
  /** Para empate en el corte: candidatos empatados que ocupan los puestos restantes. */
  electedIds?: string[];
  /** Presidente elegido entre los empatados (o entre los electos si vuelve a haber empate). */
  presidentId?: string;
}

export type TieResolutionOutcome = { ok: true; result: TallyResult } | { ok: false; error: string };

/**
 * Aplica la decisión de la Comisión sobre un empate que los votos de presidente
 * no resolvieron (decisión F2 del usuario; se aparta del Art. 40 y queda en acta).
 *
 * La Comisión solo puede elegir entre los candidatos empatados.
 *
 * @param result escrutinio con empate
 * @param seats puestos a elegir
 * @param choice decisión de la Comisión
 */
export function resolveTie(result: TallyResult, seats: number, choice: TieChoice): TieResolutionOutcome {
  const tie = result.tie;
  if (!tie) return { ok: false, error: "El escrutinio no tiene ningún empate que resolver." };

  let elected: string[];
  let chosenIds: string[] = [];

  if (tie.type === "CUT") {
    const tied = new Set(tie.candidateIds);
    const ref = result.totals.find((t) => tied.has(t.candidateId));
    if (!ref) return { ok: false, error: "Empate sin candidatos." };
    const sure = result.totals
      .filter(
        (t) =>
          !tied.has(t.candidateId) &&
          (t.memberVotes > ref.memberVotes ||
            (t.memberVotes === ref.memberVotes && t.presidentVotes > ref.presidentVotes)),
      )
      .map((t) => t.candidateId);
    const remaining = seats - sure.length;
    const chosen = Array.from(new Set(choice.electedIds ?? []));
    if (chosen.length !== remaining || chosen.some((id) => !tied.has(id))) {
      return {
        ok: false,
        error: `Debe elegir exactamente ${remaining} candidato(s) entre los empatados para completar los ${seats} puestos.`,
      };
    }
    chosenIds = chosen;
    const electedSet = new Set([...sure, ...chosen]);
    elected = result.totals.filter((t) => electedSet.has(t.candidateId)).map((t) => t.candidateId);
  } else {
    elected = result.elected;
  }

  const electedTotals = result.totals.filter((t) => elected.includes(t.candidateId));
  const maxPresident = electedTotals.reduce((m, t) => Math.max(m, t.presidentVotes), -1);
  const presidentPool =
    tie.type === "PRESIDENT"
      ? tie.candidateIds
      : electedTotals.filter((t) => t.presidentVotes === maxPresident).map((t) => t.candidateId);

  let presidentId: string;
  if (presidentPool.length === 1 && !choice.presidentId) {
    presidentId = presidentPool[0]!;
  } else if (choice.presidentId && presidentPool.includes(choice.presidentId)) {
    presidentId = choice.presidentId;
  } else {
    return { ok: false, error: "Elija al presidente entre los candidatos empatados en votos de presidente." };
  }

  return {
    ok: true,
    result: {
      totals: result.totals,
      elected,
      presidentId,
      tie: null,
      resolution: { type: tie.type, tiedIds: [...tie.candidateIds], chosenIds, presidentId },
    },
  };
}
