/**
 * Máquina de estados del proceso electoral y permisos por rol.
 *
 * Asignación de roles (docs/migracion-web/09 §3.1 «Roles y quién cambia cada estado»):
 *  - **ADMIN**: inicia el proceso y cambia los estados **decisivos**.
 *  - **COMMISSION**: cambia los estados **intermedios**, que el votante no ve.
 *  - **VOTER**: solo ve e interactúa en `ABIERTA`.
 *  - **OBSERVER**: solo observa.
 *
 * El scheduler ejecuta apertura y cierre bajo autorización del ADMIN; no actúa
 * por iniciativa propia.
 *
 * Reglas estructurales:
 *  - Un solo proceso activo por estructura y año lectivo.
 *  - `BORRADOR` es editable; `CONVOCADO` congela reglas y fechas; `LISTO` congela
 *    candidatos, orden de boleta y padrón; `ABIERTA` congela todo.
 *  - No se reabre un proceso: se anula y se crea otro.
 *  - Toda transición escribe un evento de auditoría.
 */

import type { ProcessStatus, UserRole } from "./types";

export interface Transition {
  to: ProcessStatus;
  /** Roles autorizados a ejecutar la transición. */
  roles: UserRole[];
  /** Razón o etiqueta para la auditoría. */
  label: string;
}

/**
 * Transiciones permitidas por estado de origen.
 *
 * `ADMIN` cubre las decisivas: convocar, abrir y cerrar.
 * `COMMISSION` cubre las intermedias: cerrar candidaturas, escrutar, proclamar,
 * designar el VP, publicar y resolver vacantes o reclamaciones.
 */
export const TRANSITIONS: Record<ProcessStatus, Transition[]> = {
  BORRADOR: [
    { to: "CONVOCADO", roles: ["ADMIN"], label: "Convocar" },
    { to: "ANULADA", roles: ["ADMIN", "COMMISSION"], label: "Descartar" },
  ],
  CONVOCADO: [
    { to: "LISTO", roles: ["COMMISSION"], label: "Cerrar candidaturas y snapshot" },
    { to: "ANULADA", roles: ["ADMIN", "COMMISSION"], label: "Anular" },
  ],
  LISTO: [
    { to: "ABIERTA", roles: ["ADMIN"], label: "Abrir votación" },
    { to: "ANULADA", roles: ["ADMIN", "COMMISSION"], label: "Anular" },
  ],
  ABIERTA: [
    { to: "CERRADA", roles: ["ADMIN"], label: "Cerrar votación" },
  ],
  CERRADA: [
    { to: "ESCRUTADA", roles: ["COMMISSION"], label: "Escrutar" },
  ],
  ESCRUTADA: [
    { to: "PROCLAMADA", roles: ["COMMISSION"], label: "Proclamar" },
    { to: "EMPATE", roles: ["COMMISSION"], label: "Registrar empate" },
    { to: "SIN_QUORUM", roles: ["COMMISSION"], label: "Registrar falta de quórum" },
  ],
  EMPATE: [
    { to: "SEGUNDA_VUELTA", roles: ["COMMISSION"], label: "Crear proceso hijo" },
  ],
  SEGUNDA_VUELTA: [
    { to: "ESCRUTADA", roles: ["COMMISSION"], label: "Escrutar segunda vuelta" },
  ],
  SIN_QUORUM: [
    { to: "ANULADA", roles: ["ADMIN", "COMMISSION"], label: "Anular proceso" },
  ],
  PROCLAMADA: [
    { to: "VP_DESIGNADA", roles: ["COMMISSION"], label: "Designar vicepresidente" },
  ],
  VP_DESIGNADA: [
    { to: "FINALIZADA", roles: ["COMMISSION"], label: "Publicar resultados finales" },
  ],
  FINALIZADA: [
    { to: "IMPUGNADA", roles: ["COMMISSION"], label: "Reclamación" },
    { to: "VACANTE", roles: ["COMMISSION"], label: "Registrar vacante" },
  ],
  IMPUGNADA: [
    { to: "FINALIZADA", roles: ["COMMISSION"], label: "Resolver reclamación" },
  ],
  VACANTE: [
    { to: "FINALIZADA", roles: ["COMMISSION"], label: "Aplicar sucesión" },
  ],
  ANULADA: [],
};

/** Estados en los que el votante puede ver e interactuar con el proceso. */
export const VOTER_VISIBLE_STATUSES: readonly ProcessStatus[] = ["ABIERTA"];

/** Estados en los que se aceptan boletas. */
export const ACCEPTING_BALLOTS_STATUSES: readonly ProcessStatus[] = ["ABIERTA"];

/**
 * Indica si un rol puede ejecutar una transición.
 *
 * @param from estado actual
 * @param to estado destino
 * @param role rol del actor
 */
export function canTransition(
  from: ProcessStatus,
  to: ProcessStatus,
  role: UserRole,
): boolean {
  const transition = TRANSITIONS[from].find((t) => t.to === to);
  if (!transition) return false;
  return transition.roles.includes(role);
}

/**
 * Devuelve las transiciones disponibles para un rol desde un estado.
 *
 * @param from estado actual
 * @param role rol del actor
 */
export function availableTransitions(
  from: ProcessStatus,
  role: UserRole,
): Transition[] {
  return TRANSITIONS[from].filter((t) => t.roles.includes(role));
}

/**
 * Indica si un estado es visible para el votante.
 *
 * @param status estado del proceso
 */
export function isVisibleToVoter(status: ProcessStatus): boolean {
  return VOTER_VISIBLE_STATUSES.includes(status);
}

/**
 * Indica si el proceso está en un estado terminal.
 *
 * @param status estado del proceso
 */
export function isTerminal(status: ProcessStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
