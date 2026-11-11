import { NextRequest, NextResponse } from "next/server";
import { electionStore } from "@/server/election-store";
import { ProcessStatus } from "@/domain/types";

/**
 * Consulta el estado global de la elección, candidatos, electores y afluencia.
 */
export async function GET() {
  await electionStore.ensureReady();
  const summary = electionStore.getSummary();
  const candidates = electionStore.snapshot;
  const electors = Array.from(electionStore.participations.values()).map((p) => ({
    ci: p.voterCi,
    name: p.voterName,
    brigadeCode: p.brigadeCode,
    hasVoted: p.hasVoted,
    receiptHash: p.receiptHash,
  }));

  return NextResponse.json({
    ok: true,
    summary,
    config: electionStore.config,
    candidates,
    electors,
    commission: electionStore.commission,
    tallyResult: electionStore.tallyResult,
    designatedVpId: electionStore.designatedVpId,
    composition: electionStore.composition,
  });
}

/**
 * Cambia el estado del proceso electoral (solo ADMIN o COMISIÓN según el estado).
 */
export async function POST(request: NextRequest) {
  try {
    await electionStore.ensureReady();
    const body = (await request.json()) as { action: "ABRIR" | "CERRAR" | "REINICIAR" | "SET_STATUS"; status?: ProcessStatus };

    if (body.action === "ABRIR") {
      await electionStore.setStatus("ABIERTA");
      return NextResponse.json({
        ok: true,
        message: "Votación abierta formalmente. Las urnas reciben sufragios.",
        status: electionStore.status,
      });
    }

    if (body.action === "CERRAR") {
      await electionStore.setStatus("CERRADA");
      return NextResponse.json({
        ok: true,
        message: "Votación cerrada. Las urnas han sido selladas para el escrutinio.",
        status: electionStore.status,
      });
    }

    if (body.action === "REINICIAR") {
      electionStore.ballots = [];
      for (const p of electionStore.participations.values()) {
        p.hasVoted = false;
        delete p.votedAt;
        delete p.receiptHash;
      }
      electionStore.tallyResult = null;
      electionStore.designatedVpId = null;
      electionStore.composition = null;
      await electionStore.setStatus("ABIERTA");

      return NextResponse.json({
        ok: true,
        message: "Proceso reiniciado para nueva prueba con urnas en cero.",
        status: electionStore.status,
      });
    }

    if (body.action === "SET_STATUS" && body.status) {
      await electionStore.setStatus(body.status);
      return NextResponse.json({
        ok: true,
        message: `Estado establecido en ${body.status}.`,
        status: electionStore.status,
      });
    }

    return NextResponse.json({ ok: false, error: "Acción no reconocida." }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Error procesando petición." }, { status: 400 });
  }
}

