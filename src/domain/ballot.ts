/**
 * Validación de la boleta.
 *
 * Art. 61: se puede marcar hasta `N` miembros y **un solo** presidente, que
 * debe estar entre los marcados como miembro.
 *
 * Decisión de producto (Q-L02): **no existe voto en blanco**. Una boleta con
 * 0 marcas es inválida. Si el elector insiste tras el aviso, la boleta se
 * registra como `ANULADA_POR_ELECTOR`: cuenta participación, no suma votos y
 * consume el voto. Abstenerse es no votar.
 *
 * Este módulo es puro: la validación del servidor es la autoridad; la UI solo
 * ayuda a evitar los errores.
 */

import type {
  BallotSelection,
  ProcessRules,
  ValidationError,
  ValidationOutcome,
} from "./types";

/**
 * Valida las selecciones de una boleta contra las reglas del proceso.
 *
 * @param selections marcas enviadas por el elector
 * @param rules reglas del proceso (de donde salen `maxMemberMarks`)
 * @param knownCandidateIds identificadores de los candidatos de la lista cargada
 */
export function validateBallot(
  selections: readonly BallotSelection[],
  rules: Pick<ProcessRules, "maxMemberMarks" | "minMemberMarks" | "presidentMarks">,
  knownCandidateIds: readonly string[],
): ValidationOutcome {
  const errors: ValidationError[] = [];

  const known = new Set(knownCandidateIds);
  const seen = new Set<string>();
  let duplicated = false;
  let outsideList = false;

  for (const selection of selections) {
    if (seen.has(selection.processCandidateId)) {
      duplicated = true;
    }
    seen.add(selection.processCandidateId);
    if (!known.has(selection.processCandidateId)) {
      outsideList = true;
    }
  }

  if (duplicated) {
    errors.push({
      code: "CANDIDATO_REPETIDO",
      message: "Hay un candidato marcado más de una vez.",
    });
  }

  if (outsideList) {
    errors.push({
      code: "CANDIDATO_FUERA_DE_LISTA",
      message: "Hay una marca de un candidato que no está en la lista de candidatos.",
    });
  }

  const memberSelections = selections.filter((s) => s.member);
  const presidentSelections = selections.filter((s) => s.president);

  const memberCount = memberSelections.length;
  if (memberCount < rules.minMemberMarks) {
    errors.push({
      code: "MARCA_MIEMBRO_CERO",
      message:
        rules.minMemberMarks === 0
          ? "No marcaste ningún miembro."
          : `Marcaste ${memberCount} miembros y el mínimo es ${rules.minMemberMarks}.`,
    });
  }
  if (memberCount > rules.maxMemberMarks) {
    errors.push({
      code: "MARCA_MIEMBRO_EXCESO",
      message: `Marcaste ${memberCount} miembros y el máximo es ${rules.maxMemberMarks}.`,
    });
  }

  if (presidentSelections.length !== rules.presidentMarks) {
    errors.push(
      presidentSelections.length === 0
        ? { code: "MARCA_PRESIDENTE_CERO", message: "No marcaste a ningún presidente." }
        : {
            code: "MARCA_PRESIDENTE_MULTIPLE",
            message: `Marcaste ${presidentSelections.length} presidentes y solo se permite uno.`,
          },
    );
  }

  // El presidente debe estar entre los marcados como miembro (Art. 61).
  const memberIds = new Set(memberSelections.map((s) => s.processCandidateId));
  const presidentOutsideMembers = presidentSelections.some(
    (s) => !memberIds.has(s.processCandidateId),
  );
  if (presidentOutsideMembers) {
    errors.push({
      code: "PRESIDENTE_NO_MIEMBRO",
      message: "El presidente marcado también debe estar marcado como miembro.",
    });
  }

  if (errors.length === 0) {
    return { ok: true, errors: [] };
  }
  return { ok: false, errors };
}

/**
 * Extrae las marcas de una boleta ya validada.
 *
 * @param selections marcas de la boleta
 */
export function readMarks(selections: readonly BallotSelection[]): {
  memberIds: string[];
  presidentId: string | null;
} {
  const memberIds = selections.filter((s) => s.member).map((s) => s.processCandidateId);
  const president = selections.find((s) => s.president);
  return { memberIds, presidentId: president ? president.processCandidateId : null };
}
