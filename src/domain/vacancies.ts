/**
 * Dominio puro para la gestión de vacantes, ceses y sucesión en el Secretariado (Arts. 99–102 del ABC de la FEU 2019).
 *
 * Reglas fundamentales:
 *  - Módulo puro, determinista, sin I/O ni efectos secundarios.
 *  - Sucesión presidencial: ante vacante (dimisión, separación o baja), asume por defecto
 *    el Vicepresidente electo, o la Comisión/Consejo puede promover a otro miembro electo (Art. 102).
 *  - Cada cambio incrementa la versión de la composición (`versionNumber`) y genera un registro inmutable.
 */

export type VacancyReason =
  | "DIMISION_VOLUNTARIA" // Renuncia voluntaria (no requiere votación de sanción, Art. 99)
  | "SEPARACION_DISCIPLINARIA" // Sanción o revocación aprobada por el Consejo (Arts. 99, 101)
  | "GRADUACION_O_BAJA"; // Pérdida de condición estudiantil activa

export type SecretariatRole = "PRESIDENTE" | "VICEPRESIDENTE" | "MIEMBRO";

export interface SecretariatMemberInfo {
  candidateId: string;
  fullName: string;
  brigadeCode: string;
  role: SecretariatRole;
  effectiveFrom: string;
}

export interface SecretariatComposition {
  version: number;
  updatedAt: string;
  reason: string;
  president: SecretariatMemberInfo;
  vicePresident: SecretariatMemberInfo | null;
  members: SecretariatMemberInfo[];
  historicalEvents: VacancyEvent[];
}

export interface VacancyEvent {
  id: string;
  timestamp: string;
  outgoingCandidateId: string;
  outgoingFullName: string;
  vacatedRole: SecretariatRole;
  reason: VacancyReason;
  justification: string;
  successorCandidateId?: string;
  successorFullName?: string;
  councilQuorumMet: boolean; // >85 % de asistencia del Consejo si aplica
  councilMajorityMet: boolean; // 50% + 1 a favor si aplica
}

/**
 * Genera la composición inicial (versión 1) a partir de la proclamación y la designación de VP.
 */
export function createInitialComposition(
  presidentCandidate: { candidateId: string; fullName: string; brigadeCode: string },
  vicePresidentCandidate: { candidateId: string; fullName: string; brigadeCode: string },
  otherElected: Array<{ candidateId: string; fullName: string; brigadeCode: string }>,
  proclamationDate: string = new Date().toISOString(),
): SecretariatComposition {
  const president: SecretariatMemberInfo = {
    candidateId: presidentCandidate.candidateId,
    fullName: presidentCandidate.fullName,
    brigadeCode: presidentCandidate.brigadeCode,
    role: "PRESIDENTE",
    effectiveFrom: proclamationDate,
  };

  const vicePresident: SecretariatMemberInfo = {
    candidateId: vicePresidentCandidate.candidateId,
    fullName: vicePresidentCandidate.fullName,
    brigadeCode: vicePresidentCandidate.brigadeCode,
    role: "VICEPRESIDENTE",
    effectiveFrom: proclamationDate,
  };

  const members: SecretariatMemberInfo[] = otherElected
    .filter(
      (m) =>
        m.candidateId !== presidentCandidate.candidateId &&
        m.candidateId !== vicePresidentCandidate.candidateId,
    )
    .map((m) => ({
      candidateId: m.candidateId,
      fullName: m.fullName,
      brigadeCode: m.brigadeCode,
      role: "MIEMBRO",
      effectiveFrom: proclamationDate,
    }));

  return {
    version: 1,
    updatedAt: proclamationDate,
    reason: "Proclamación oficial y designación de Vicepresidencia (Art. 67)",
    president,
    vicePresident,
    members,
    historicalEvents: [],
  };
}

export interface ProcessVacancyInput {
  currentComposition: SecretariatComposition;
  reason: VacancyReason;
  justification: string;
  successorCandidateId?: string | undefined; // Opcional: si no se indica, asume el Vicepresidente
  councilAttendancePct?: number | undefined; // Asistencia del Consejo (Art. 101/102 requiere >85%)
  councilVotesInFavorPct?: number | undefined; // Votos a favor del Consejo (Art. 101/102 requiere 50% + 1)
  timestamp?: string | undefined;
}

export interface ProcessVacancyResult {
  ok: boolean;
  composition?: SecretariatComposition;
  event?: VacancyEvent;
  error?: string;
}

/**
 * Procesa la vacante presidencial según los Artículos 99, 101 y 102 del ABC de la FEU (2019).
 */
export function processPresidentialVacancy(
  input: ProcessVacancyInput,
): ProcessVacancyResult {
  const { currentComposition, reason, justification } = input;
  const now = input.timestamp || new Date().toISOString();

  // Validaciones del Consejo si es separación disciplinaria (Arts. 99, 101)
  if (reason === "SEPARACION_DISCIPLINARIA") {
    if (input.councilAttendancePct !== undefined && input.councilAttendancePct <= 85) {
      return {
        ok: false,
        error: "Para aprobar una separación disciplinaria debe estar presente más del 85 % de los miembros del Consejo (Art. 101).",
      };
    }
    if (input.councilVotesInFavorPct !== undefined && input.councilVotesInFavorPct <= 50) {
      return {
        ok: false,
        error: "Para aprobar una separación disciplinaria se requiere el 50 % más 1 de los votos favorables del Consejo (Art. 101).",
      };
    }
  }

  const outgoingPresident = currentComposition.president;

  // Determinar sucesor
  let newPresidentCandidate: SecretariatMemberInfo | null = null;
  const remainingMembers = [...currentComposition.members];
  let remainingVp = currentComposition.vicePresident;

  if (input.successorCandidateId) {
    // Si se especificó un sucesor explícito (debe ser el VP o uno de los miembros electos)
    if (remainingVp && remainingVp.candidateId === input.successorCandidateId) {
      newPresidentCandidate = {
        candidateId: remainingVp.candidateId,
        fullName: remainingVp.fullName,
        brigadeCode: remainingVp.brigadeCode,
        role: "PRESIDENTE",
        effectiveFrom: now,
      };
      remainingVp = null; // El VP asciende a Presidente, la vicepresidencia queda vacante
    } else {
      const foundIdx = remainingMembers.findIndex(
        (m) => m.candidateId === input.successorCandidateId,
      );
      if (foundIdx === -1) {
        return {
          ok: false,
          error: "El candidato promovido a la Presidencia debe pertenecer al Secretariado electo (Art. 102).",
        };
      }
      const found = remainingMembers[foundIdx]!;
      newPresidentCandidate = {
        candidateId: found.candidateId,
        fullName: found.fullName,
        brigadeCode: found.brigadeCode,
        role: "PRESIDENTE",
        effectiveFrom: now,
      };
      // Se retira de la lista de miembros ordinarios
      remainingMembers.splice(foundIdx, 1);
    }
  } else {
    // Sucesor por defecto: el Vicepresidente electo asume la presidencia
    if (!remainingVp) {
      return {
        ok: false,
        error: "No existe un Vicepresidente electo disponible para asumir automáticamente. Debe seleccionarse un miembro del Secretariado.",
      };
    }
    newPresidentCandidate = {
      candidateId: remainingVp.candidateId,
      fullName: remainingVp.fullName,
      brigadeCode: remainingVp.brigadeCode,
      role: "PRESIDENTE",
      effectiveFrom: now,
    };
    remainingVp = null; // Queda vacante la vicepresidencia
  }

  if (!newPresidentCandidate) {
    return {
      ok: false,
      error: "No se pudo determinar un sucesor presidencial válido.",
    };
  }

  const event: VacancyEvent = {
    id: `vac-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    outgoingCandidateId: outgoingPresident.candidateId,
    outgoingFullName: outgoingPresident.fullName,
    vacatedRole: "PRESIDENTE",
    reason,
    justification,
    successorCandidateId: newPresidentCandidate.candidateId,
    successorFullName: newPresidentCandidate.fullName,
    councilQuorumMet: input.councilAttendancePct ? input.councilAttendancePct > 85 : true,
    councilMajorityMet: input.councilVotesInFavorPct ? input.councilVotesInFavorPct > 50 : true,
  };

  const newComposition: SecretariatComposition = {
    version: currentComposition.version + 1,
    updatedAt: now,
    reason: `Sucesión presidencial por ${reason}: asume ${newPresidentCandidate.fullName} (Art. 102)`,
    president: newPresidentCandidate,
    vicePresident: remainingVp,
    members: remainingMembers,
    historicalEvents: [...currentComposition.historicalEvents, event],
  };

  return {
    ok: true,
    composition: newComposition,
    event,
  };
}

/**
 * Designa un nuevo Vicepresidente entre los miembros electos cuando queda vacante.
 */
export function designateSuccessorVicePresident(
  currentComposition: SecretariatComposition,
  newVpCandidateId: string,
  justification: string = "Designación reglamentaria de nueva Vicepresidencia ante vacante",
  timestamp?: string,
): ProcessVacancyResult {
  const now = timestamp || new Date().toISOString();

  const foundIdx = currentComposition.members.findIndex(
    (m) => m.candidateId === newVpCandidateId,
  );
  if (foundIdx === -1) {
    return {
      ok: false,
      error: "El nuevo Vicepresidente debe ser seleccionado de entre los miembros electos del Secretariado (Art. 67).",
    };
  }

  const targetMember = currentComposition.members[foundIdx]!;
  const newVp: SecretariatMemberInfo = {
    candidateId: targetMember.candidateId,
    fullName: targetMember.fullName,
    brigadeCode: targetMember.brigadeCode,
    role: "VICEPRESIDENTE",
    effectiveFrom: now,
  };

  const remainingMembers = [...currentComposition.members];
  remainingMembers.splice(foundIdx, 1);

  const event: VacancyEvent = {
    id: `vp-desig-${Date.now()}`,
    timestamp: now,
    outgoingCandidateId: currentComposition.vicePresident?.candidateId || "VACANTE",
    outgoingFullName: currentComposition.vicePresident?.fullName || "Plaza Vacante",
    vacatedRole: "VICEPRESIDENTE",
    reason: "DIMISION_VOLUNTARIA",
    justification,
    successorCandidateId: newVp.candidateId,
    successorFullName: newVp.fullName,
    councilQuorumMet: true,
    councilMajorityMet: true,
  };

  const newComposition: SecretariatComposition = {
    version: currentComposition.version + 1,
    updatedAt: now,
    reason: `Nueva Vicepresidencia designada: ${newVp.fullName} (Art. 67)`,
    president: currentComposition.president,
    vicePresident: newVp,
    members: remainingMembers,
    historicalEvents: [...currentComposition.historicalEvents, event],
  };

  return {
    ok: true,
    composition: newComposition,
    event,
  };
}
