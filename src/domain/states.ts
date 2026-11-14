/**
 * Máquina de estados del proceso electoral (v1, decisión F2).
 *
 *   CONVOCADO ─abrir→ ABIERTA ─cerrar→ CERRADA ─escrutar→ SIN_QUORUM (terminal)
 *                                                       ├→ EMPATE ─resolver→ PROCLAMADA
 *                                                       └→ PROCLAMADA
 *   PROCLAMADA ─designar VP→ VP_DESIGNADA ─publicar→ FINALIZADA
 *   VP_DESIGNADA | FINALIZADA ─vacante presidencial→ VACANTE ─nuevo VP→ FINALIZADA
 *
 * La consola electoral la operan la Comisión y el Administrador (handout §2.1).
 * Un proceso cerrado no se reabre y no existe reinicio de urnas.
 */

import type { ProcessStatus, UserRole } from "./types";

export interface Transition {
  to: ProcessStatus;
  /** Roles autorizados a ejecutar la transición. */
  roles: UserRole[];
  /** Etiqueta para la auditoría. */
  label: string;
}

const CONSOLE: UserRole[] = ["ADMIN", "COMMISSION"];

export const TRANSITIONS: Record<ProcessStatus, Transition[]> = {
  CONVOCADO: [{ to: "ABIERTA", roles: CONSOLE, label: "Abrir votación" }],
  ABIERTA: [{ to: "CERRADA", roles: CONSOLE, label: "Cerrar votación" }],
  CERRADA: [
    { to: "SIN_QUORUM", roles: CONSOLE, label: "Escrutar: sin quórum" },
    { to: "EMPATE", roles: CONSOLE, label: "Escrutar: empate" },
    { to: "PROCLAMADA", roles: CONSOLE, label: "Escrutar y proclamar" },
  ],
  SIN_QUORUM: [],
  EMPATE: [{ to: "PROCLAMADA", roles: CONSOLE, label: "Resolver empate por la Comisión" }],
  PROCLAMADA: [{ to: "VP_DESIGNADA", roles: CONSOLE, label: "Designar vicepresidente" }],
  VP_DESIGNADA: [
    { to: "FINALIZADA", roles: CONSOLE, label: "Publicar resultados finales" },
    { to: "VACANTE", roles: CONSOLE, label: "Registrar vacante presidencial" },
  ],
  FINALIZADA: [{ to: "VACANTE", roles: CONSOLE, label: "Registrar vacante presidencial" }],
  VACANTE: [{ to: "FINALIZADA", roles: CONSOLE, label: "Designar nuevo vicepresidente" }],
};

/** Estados en los que el votante puede votar. */
export const VOTER_VISIBLE_STATUSES: readonly ProcessStatus[] = ["ABIERTA"];

/** Estados en los que se aceptan boletas. */
export const ACCEPTING_BALLOTS_STATUSES: readonly ProcessStatus[] = ["ABIERTA"];

/** Estados con resultados proclamados (visibles para los votantes). */
export const RESULTS_PUBLIC_STATUSES: readonly ProcessStatus[] = ["PROCLAMADA", "VP_DESIGNADA", "FINALIZADA", "VACANTE"];

export function canTransition(from: ProcessStatus, to: ProcessStatus, role: UserRole): boolean {
  const transition = TRANSITIONS[from]?.find((t) => t.to === to);
  return Boolean(transition && transition.roles.includes(role));
}

export function availableTransitions(from: ProcessStatus, role: UserRole): Transition[] {
  return (TRANSITIONS[from] ?? []).filter((t) => t.roles.includes(role));
}

export function isVisibleToVoter(status: ProcessStatus): boolean {
  return VOTER_VISIBLE_STATUSES.includes(status);
}

export function isTerminal(status: ProcessStatus): boolean {
  return (TRANSITIONS[status] ?? []).length === 0;
}
