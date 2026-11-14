/**
 * Tipos del dominio electoral.
 *
 * Reglas de la casa:
 *  - Ningún número electoral (9, 11, 5, 85) puede aparecer aquí.
 *  - Los valores vienen de la configuración del proceso.
 *  - Este módulo es puro: no importa Prisma, ni Next, ni nada de infraestructura.
 */

/**
 * Estados del proceso electoral usados en v1 (decisión F2).
 * Otros estados del plan (BORRADOR, LISTO, IMPUGNADA, ANULADA, SEGUNDA_VUELTA)
 * quedan documentados como ampliación futura.
 */
export type ProcessStatus =
  | "CONVOCADO"
  | "ABIERTA"
  | "CERRADA"
  | "SIN_QUORUM"
  | "EMPATE"
  | "PROCLAMADA"
  | "VP_DESIGNADA"
  | "FINALIZADA"
  | "VACANTE";

/** Roles del sistema (docs/migracion-web/09 §3.1 «Roles y quién cambia cada estado»). */
export type UserRole = "ADMIN" | "COMMISSION" | "VOTER" | "OBSERVER";

/** Cargo dentro del Secretariado. */
export type Office = "PRESIDENTE" | "VICEPRESIDENTE" | "MIEMBRO" | "NO_ELECTO";

/** Modo de votación. */
export type VotingMode = "SECRET" | "PUBLIC";

/** Regla de desempate (Art. 40). */
export type TieRule = "PRESIDENT_VOTES_THEN_RUNOFF";

/** Regla de mayoría según nivel. */
export type MajorityRule = "TOP_N" | "TOP_N_OVER_50" | "FIFTY_PLUS_ONE";

/** Reglas de un proceso, tal como las consume el dominio. */
export interface ProcessRules {
  level: "BRIGADA" | "FACULTAD" | "CENTRO" | "NACIONAL";
  /** Regla de derivación de puestos. Solo se admite la vigente en v1. */
  seatsRule: "CANDIDATES_MINUS_TWO";
  /** Candidatos adicionales a los electos (Art. 59). */
  extraCandidates: number;
  /** Espacios de propuesta en la boleta. 0 en v1 (Q-L03). */
  proposalSlots: number;
  votingMode: VotingMode;
  /** Mínimo de marcas de miembro. 1 en v1: no hay voto en blanco. */
  minMemberMarks: number;
  /** Máximo de marcas de miembro. Deriva de los puestos. */
  maxMemberMarks: number;
  /** Marcas de presidente: exactamente 1. */
  presidentMarks: 1;
  quorumPct: number;
  quorumExceptionPct?: number;
  quorumExceptionScope?: "UNIVERSIDAD";
  majorityRule: MajorityRule;
  tieRule: TieRule;
  columns: string[];
  vicePresident: "POST_TALLY_FROM_ELECTED" | "POST_TALLY_ANY";
  vacancy: "VP_SUCCEEDS" | "NEXT_ELECTED" | "NEW_ELECTION";
}

/** Una marca de la boleta. */
export interface BallotSelection {
  processCandidateId: string;
  member: boolean;
  president: boolean;
}

/** Error de validación de boleta, con código estable y mensaje para la UI. */
export interface ValidationError {
  code:
    | "MARCA_MIEMBRO_CERO"
    | "MARCA_MIEMBRO_EXCESO"
    | "MARCA_PRESIDENTE_CERO"
    | "MARCA_PRESIDENTE_MULTIPLE"
    | "PRESIDENTE_NO_MIEMBRO"
    | "CANDIDATO_REPETIDO"
    | "CANDIDATO_FUERA_DE_LISTA";
  message: string;
}

/** Resultado de validar una boleta. */
export type ValidationOutcome =
  | { ok: true; errors: [] }
  | { ok: false; errors: ValidationError[] };
