import { NextRequest, NextResponse } from "next/server";
import { electionStore } from "@/server/election-store";
import {
  designateSuccessorVicePresident,
  processPresidentialVacancy,
  VacancyReason,
} from "@/domain/vacancies";

/**
 * Endpoint para la gestión reglamentaria de vacantes y sucesión en el Secretariado (Arts. 99–102 del ABC de la FEU 2019).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      type: "VACANCIA_PRESIDENTE" | "DESIGNAR_NUEVO_VP";
      reason?: VacancyReason;
      justification?: string;
      successorCandidateId?: string;
      councilAttendancePct?: number;
      councilVotesInFavorPct?: number;
    };

    if (!electionStore.composition) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No existe una composición activa del Secretariado. Debe haberse realizado el escrutinio y la proclamación inicial.",
        },
        { status: 400 },
      );
    }

    if (body.type === "VACANCIA_PRESIDENTE") {
      const reason = body.reason || "DIMISION_VOLUNTARIA";
      const justification =
        body.justification || "Trámite de renuncia / separación conforme a reglamento";

      const result = processPresidentialVacancy({
        currentComposition: electionStore.composition,
        reason,
        justification,
        successorCandidateId: body.successorCandidateId,
        councilAttendancePct: body.councilAttendancePct,
        councilVotesInFavorPct: body.councilVotesInFavorPct,
      });

      if (!result.ok || !result.composition) {
        return NextResponse.json(
          { ok: false, error: result.error || "Error al procesar la vacante presidencial." },
          { status: 422 },
        );
      }

      await electionStore.saveCompositionState(result.composition);
      await electionStore.setStatus("VACANTE");

      return NextResponse.json({
        ok: true,
        message: `Vacancia procesada con éxito. Nuevo Presidente: ${result.composition.president.fullName} (Versión ${result.composition.version}).`,
        composition: electionStore.composition,
        event: result.event,
        status: electionStore.status,
      });
    }

    if (body.type === "DESIGNAR_NUEVO_VP") {
      if (!body.successorCandidateId) {
        return NextResponse.json(
          { ok: false, error: "Identificador del candidato a la Vicepresidencia requerido." },
          { status: 400 },
        );
      }

      const result = designateSuccessorVicePresident(
        electionStore.composition,
        body.successorCandidateId,
        body.justification || "Designación reglamentaria de nueva Vicepresidencia (Art. 67)",
      );

      if (!result.ok || !result.composition) {
        return NextResponse.json(
          { ok: false, error: result.error || "Error al designar el nuevo Vicepresidente." },
          { status: 422 },
        );
      }

      await electionStore.saveCompositionState(
        result.composition,
        result.composition.vicePresident?.candidateId || null,
      );
      await electionStore.setStatus("FINALIZADA");

      return NextResponse.json({
        ok: true,
        message: `Nueva Vicepresidencia designada: ${result.composition.vicePresident?.fullName} (Versión ${result.composition.version}).`,
        composition: electionStore.composition,
        event: result.event,
        status: electionStore.status,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Tipo de acción de vacante no reconocido." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error procesando el trámite de vacancia." },
      { status: 500 },
    );
  }
}
