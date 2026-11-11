import { NextRequest, NextResponse } from "next/server";
import { electionStore } from "@/server/election-store";
import { createInitialComposition } from "@/domain/vacancies";

/**
 * Designación del Vicepresidente por la Comisión Electoral entre los miembros electos (F5, Art. 67).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { candidateId?: string };
    const candidateId = body.candidateId?.trim();

    if (!candidateId) {
      return NextResponse.json(
        { ok: false, error: "Identificador del candidato a designar requerido." },
        { status: 400 },
      );
    }

    if (!electionStore.tallyResult) {
      return NextResponse.json(
        { ok: false, error: "Debe realizarse el escrutinio antes de designar al Vicepresidente." },
        { status: 400 },
      );
    }

    if (!electionStore.tallyResult.elected.includes(candidateId)) {
      return NextResponse.json(
        { ok: false, error: "El Vicepresidente debe ser seleccionado exclusivamente entre los miembros electos del secretariado." },
        { status: 422 },
      );
    }

    if (electionStore.tallyResult.presidentId === candidateId) {
      return NextResponse.json(
        { ok: false, error: "El Presidente electo no puede ser simultáneamente Vicepresidente." },
        { status: 422 },
      );
    }

    const candidate = electionStore.snapshot.find((c) => c.candidateId === candidateId);
    const presCandidate = electionStore.snapshot.find((c) => c.candidateId === electionStore.tallyResult!.presidentId);
    const otherElected = electionStore.snapshot.filter((c) => electionStore.tallyResult!.elected.includes(c.candidateId));

    if (presCandidate && candidate) {
      const comp = createInitialComposition(presCandidate, candidate, otherElected);
      await electionStore.saveCompositionState(comp, candidateId);
    }
    await electionStore.setStatus("VP_DESIGNADA");

    return NextResponse.json({
      ok: true,
      message: `Vicepresidente designado formalmente: ${candidate?.fullName ?? candidateId}.`,
      designatedVpId: candidateId,
      status: electionStore.status,
      composition: electionStore.composition,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error procesando la designación de Vicepresidencia." },
      { status: 500 },
    );
  }
}

