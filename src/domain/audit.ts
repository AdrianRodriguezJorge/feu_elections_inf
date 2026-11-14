/**
 * Dominio puro de Auditoría Inmutable y Registro WORM (Write Once, Read Many).
 * Cumple con el Art. 66 del ABC de la FEU (2019) y la regla RGF-33.
 *
 * Cada evento administrativo y electoral queda encadenado criptográficamente mediante SHA-256
 * (estilo hash-chain), haciendo que cualquier intento de alteración posterior sea detectable.
 */

import { createHash } from "node:crypto";

export type AuditEventType =
  | "PROCESO_CREADO"
  | "VOTACION_ABIERTA"
  | "BOLETA_EMITIDA"
  | "VOTACION_CERRADA"
  | "ESCRUTINIO_REALIZADO"
  | "VICEPRESIDENTE_DESIGNADO"
  | "VACANCIA_PRESIDENCIAL"
  | "NUEVO_VP_DESIGNADO"
  | "PADRON_INCREMENTAL_IMPORTADO"
  | "CONFIGURACION_MODIFICADA"
  | "INICIO_SESION"
  | "EMPATE_RESUELTO"
  | "EXCEPCION_QUORUM"
  | "CUENTA_ACTIVADA"
  | "CUENTA_RESTABLECIDA"
  | "COMPOSICION_SECRETARIADO_ACTUALIZADA";

export interface AuditLogEntry {
  sequence: number;
  timestamp: string;
  actorCi: string;
  actorRole: string;
  eventType: AuditEventType;
  details: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

/**
 * Serializa un objeto JSON determinísticamente ordenando sus claves recursivamente (RFC 8785 / Canonical JSON).
 * Esto evita discrepancias criptográficas si el motor de la base de datos reordena las claves del JSON.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }
  // Las claves con valor `undefined` no existen en JSON (RFC 8785): se omiten para
  // que el hash coincida tras la ida y vuelta por la columna JSONB.
  const keys = Object.keys(obj as Record<string, unknown>)
    .filter((k) => (obj as Record<string, unknown>)[k] !== undefined)
    .sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonicalJsonStringify((obj as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}

/**
 * Calcula el hash SHA-256 determinista de un evento de auditoría.
 */
export function calculateEventHash(
  sequence: number,
  timestamp: string,
  actorCi: string,
  actorRole: string,
  eventType: AuditEventType,
  prevHash: string,
  details: Record<string, unknown>,
): string {
  const content = `${sequence}|${timestamp}|${actorCi}|${actorRole}|${eventType}|${prevHash}|${canonicalJsonStringify(details)}`;
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Crea un nuevo registro de auditoría encadenado al anterior.
 */
export function appendAuditEntry(
  history: AuditLogEntry[],
  actorCi: string,
  actorRole: string,
  eventType: AuditEventType,
  details: Record<string, unknown>,
  timestamp: string = new Date().toISOString(),
): AuditLogEntry {
  const sequence = history.length + 1;
  const prevHash = history.length > 0 ? history[history.length - 1]!.hash : "0000000000000000000000000000000000000000000000000000000000000000";
  const hash = calculateEventHash(sequence, timestamp, actorCi, actorRole, eventType, prevHash, details);

  return {
    sequence,
    timestamp,
    actorCi,
    actorRole,
    eventType,
    details,
    prevHash,
    hash,
  };
}

/**
 * Crea el evento génesis inicial de la cadena de auditoría (secuencia 1).
 */
export function createGenesisAuditEntry(details: Record<string, unknown>): AuditLogEntry {
  return appendAuditEntry([], "SYSTEM", "ADMIN", "PROCESO_CREADO", details);
}

/**
 * Verifica la integridad matemática de toda la cadena de auditoría WORM.
 * Devuelve true si todos los eslabones coinciden exactamente con sus firmas SHA-256.
 */
export function verifyAuditChainIntegrity(chain: AuditLogEntry[]): {
  valid: boolean;
  error?: string;
  brokenSequence?: number;
} {
  let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i]!;

    // 1. Validar secuencia secuencial
    if (entry.sequence !== i + 1) {
      return {
        valid: false,
        error: `Secuencia rota en posición ${i}: se esperaba ${i + 1} pero se encontró ${entry.sequence}.`,
        brokenSequence: entry.sequence,
      };
    }

    // 2. Validar vínculo con el hash previo
    if (entry.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        error: `Encadenamiento roto en el evento ${entry.sequence}: el prevHash no coincide con el eslabón anterior.`,
        brokenSequence: entry.sequence,
      };
    }

    // 3. Validar recálculo del hash del contenido
    const recomputed = calculateEventHash(
      entry.sequence,
      entry.timestamp,
      entry.actorCi,
      entry.actorRole,
      entry.eventType,
      entry.prevHash,
      entry.details,
    );

    if (recomputed !== entry.hash) {
      return {
        valid: false,
        error: `Contenido manipulado en el evento ${entry.sequence}: el hash almacenado no coincide con el contenido actual.`,
        brokenSequence: entry.sequence,
      };
    }

    expectedPrevHash = entry.hash;
  }

  return { valid: true };
}
