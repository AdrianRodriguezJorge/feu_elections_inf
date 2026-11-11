/**
 * Dominio puro de Autorización y Permisos por Rol (F2).
 *
 * Roles del sistema (docs/migracion-web/09 §3.1):
 *  - ADMIN: Inicia procesos, gestiona brigadas, convoca y abre/cierra votaciones.
 *  - COMMISSION: Estados intermedios, padrón, candidatos, escrutinio, proclamación.
 *  - VOTER: Vota únicamente en estado ABIERTA si está habilitado en el padrón.
 *  - OBSERVER: Acceso de lectura a actas, conteo y auditoría.
 */

import type { ProcessStatus, UserRole } from "./types";

export type Action =
  | "MANAGE_BRIGADES"
  | "IMPORT_PADRON"
  | "CONSTITUTE_COMMISSION"
  | "MANAGE_CANDIDATES"
  | "OPEN_VOTING"
  | "CLOSE_VOTING"
  | "TALLY_VOTES"
  | "PROCLAIM_RESULTS"
  | "DESIGNATE_VICE_PRESIDENT"
  | "CAST_BALLOT"
  | "VIEW_RESULTS"
  | "VIEW_AUDIT_LOG";

/**
 * Matriz de autorización por rol y acción.
 */
const ROLE_PERMISSIONS: Record<Action, readonly UserRole[]> = {
  MANAGE_BRIGADES: ["ADMIN"],
  IMPORT_PADRON: ["ADMIN", "COMMISSION"],
  CONSTITUTE_COMMISSION: ["ADMIN"],
  MANAGE_CANDIDATES: ["COMMISSION"],
  OPEN_VOTING: ["ADMIN"],
  CLOSE_VOTING: ["ADMIN"],
  TALLY_VOTES: ["COMMISSION"],
  PROCLAIM_RESULTS: ["COMMISSION"],
  DESIGNATE_VICE_PRESIDENT: ["COMMISSION"],
  CAST_BALLOT: ["VOTER", "COMMISSION"],
  VIEW_RESULTS: ["ADMIN", "COMMISSION", "OBSERVER", "VOTER"],
  VIEW_AUDIT_LOG: ["ADMIN", "COMMISSION", "OBSERVER"],
};

/**
 * Comprueba si un rol tiene autorización básica para ejecutar una acción.
 *
 * @param role rol del usuario
 * @param action acción que desea realizar
 */
export function hasPermission(role: UserRole, action: Action): boolean {
  return ROLE_PERMISSIONS[action].includes(role);
}

/**
 * Comprueba si un usuario puede emitir un voto en un proceso dado.
 *
 * @param role rol del usuario
 * @param processStatus estado actual del proceso electoral
 * @param isEligible si el miembro está habilitado en el padrón
 * @param hasAlreadyVoted si ya existe una participación previa
 */
export function canCastBallot(
  role: UserRole,
  processStatus: ProcessStatus,
  isEligible: boolean,
  hasAlreadyVoted: boolean,
): { allowed: boolean; reason?: string } {
  // Tanto electores (VOTER) como miembros de la Comisión Electoral (COMMISSION) son estudiantes con derecho al voto
  if (role !== "VOTER" && role !== "COMMISSION") {
    return { allowed: false, reason: "Solo los electores habilitados en el registro de electores pueden emitir su voto." };
  }
  if (processStatus !== "ABIERTA") {
    return {
      allowed: false,
      reason: `La votación no está abierta (estado actual: ${processStatus}).`,
    };
  }
  if (!isEligible) {
    return { allowed: false, reason: "El elector no está habilitado en el registro de electores de la estructura." };
  }
  if (hasAlreadyVoted) {
    return { allowed: false, reason: "Ya emitiste tu voto en este proceso electoral." };
  }
  return { allowed: true };
}
