import { NextResponse } from "next/server";
import { runTally } from "@/server/election-service";
import { errorResponse, requirePermission } from "@/server/guard";

/**
 * Escrutinio oficial, una sola vez y con la votación cerrada. El estado de
 * salida lo decide el resultado: SIN_QUORUM, EMPATE o PROCLAMADA.
 */
export async function POST() {
  const guard = await requirePermission("TALLY_VOTES");
  if (!guard.ok) return guard.response;

  try {
    const { status, tally, quorum } = await runTally(guard.user);
    return NextResponse.json({ ok: true, processStatus: status, tally, quorum });
  } catch (err) {
    return errorResponse(err);
  }
}
