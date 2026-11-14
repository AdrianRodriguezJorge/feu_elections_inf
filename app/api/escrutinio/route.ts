import { NextResponse } from "next/server";
import { electionStore } from "@/server/election-store";
import { requirePermission } from "@/server/guard";

/**
 * Realiza el escrutinio oficial de la urna digital (F5).
 *
 * Solo permitido cuando la votación está en estado CERRADA (o ya ESCRUTADA).
 */
export async function POST() {
  const guard = await requirePermission("TALLY_VOTES");
  if (!guard.ok) return guard.response;

  try {
    await electionStore.ensureReady();
    if (electionStore.status !== "CERRADA" && electionStore.status !== "ESCRUTADA" && electionStore.status !== "PROCLAMADA") {
      return NextResponse.json(
        {
          ok: false,
          error: `El escrutinio no está permitido en el estado actual (${electionStore.status}). Las urnas deben estar formalmente CERRADAS.`,
        },
        { status: 400 },
      );
    }

    const result = await electionStore.runTally(guard.user);

    // Enlazar los IDs de candidatos con sus datos completos para visualización en el acta
    const candidatesMap = new Map(electionStore.snapshot.map((c) => [c.candidateId, c]));

    const enrichedTotals = result.tallyResult.totals.map((t) => {
      const info = candidatesMap.get(t.candidateId);
      return {
        ...t,
        fullName: info?.fullName ?? t.candidateId,
        brigadeCode: info?.brigadeCode ?? "",
        isElected: result.tallyResult.elected.includes(t.candidateId),
        isPresident: result.tallyResult.presidentId === t.candidateId,
      };
    });

    const presidentCandidate = result.tallyResult.presidentId
      ? candidatesMap.get(result.tallyResult.presidentId)
      : null;

    return NextResponse.json({
      ok: true,
      quorum: result.quorum,
      tally: {
        ...result.tallyResult,
        totals: enrichedTotals,
        president: presidentCandidate,
      },
      processStatus: electionStore.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error ejecutando el escrutinio.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

