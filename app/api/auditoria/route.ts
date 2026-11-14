import { NextResponse } from "next/server";
import { getAuditStatus } from "@/server/election-service";
import { errorResponse, requirePermission } from "@/server/guard";

/** Estado e integridad de la cadena de auditoría (Art. 66). */
export async function GET() {
  const guard = await requirePermission("VIEW_AUDIT_LOG");
  if (!guard.ok) return guard.response;

  try {
    const audit = await getAuditStatus();
    return NextResponse.json({
      ok: true,
      totalEvents: audit.entriesCount,
      chainIntegrity: audit.integrity,
      latestBlockHash: audit.latestHash,
      retentionPolicy: "Retención reglamentaria de al menos 1 año (Art. 66 del ABC de la FEU, 2019)",
      recentEvents: audit.recent.map((e) => ({
        sequence: e.sequence,
        timestamp: e.timestamp,
        actorRole: e.actorRole,
        eventType: e.eventType,
        hash: e.hash,
        prevHash: e.prevHash,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
