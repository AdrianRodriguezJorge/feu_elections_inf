import { NextResponse } from "next/server";
import { electionStore } from "@/server/election-store";

/**
 * Consulta el estado y la integridad criptográfica de la cadena WORM de auditoría (Item 7.3 / Art. 66).
 */
export async function GET() {
  const auditStatus = electionStore.getAuditStatus();

  return NextResponse.json({
    ok: true,
    totalEvents: auditStatus.entriesCount,
    chainIntegrity: auditStatus.integrity,
    latestBlockHash: auditStatus.latestHash,
    retentionPolicy: "Retención reglamentaria ≥1 año conforme al Art. 66 del ABC de la FEU (2019)",
    recentEvents: electionStore.auditLog.slice(-15).map((e) => ({
      sequence: e.sequence,
      timestamp: e.timestamp,
      actorRole: e.actorRole,
      eventType: e.eventType,
      hash: e.hash,
      prevHash: e.prevHash,
    })),
  });
}

