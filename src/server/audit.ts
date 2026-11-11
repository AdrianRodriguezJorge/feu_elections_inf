/**
 * Registro de auditoría append-only (RGF-30).
 *
 * Toda transición de estado, toda importación y toda designación deben dejar
 * rastro con actor, fecha, estado anterior, estado nuevo y hash.
 */

import { prisma } from "./db";
import { createHash } from "node:crypto";

export interface AuditPayload {
  processId?: string | null;
  actorId?: string | null;
  action: string;
  entity: string;
  payload: unknown;
}

/**
 * Calcula el hash del payload de auditoría.
 *
 * @param payload contenido auditable
 */
export function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Escribe un evento de auditoría.
 *
 * @param entry datos del evento
 */
export async function recordAudit(entry: AuditPayload): Promise<void> {
  const last = await prisma.auditEvent.findFirst({
    where: entry.processId ? { processId: entry.processId } : {},
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });

  await prisma.auditEvent.create({
    data: {
      processId: entry.processId ?? null,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity,
      payloadHash: hashPayload(entry.payload),
      sequence: (last?.sequence ?? 0) + 1,
    },
  });
}
