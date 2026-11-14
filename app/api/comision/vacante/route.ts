import { NextResponse } from "next/server";
import { z } from "zod";
import { handleVacancy } from "@/server/election-service";
import { errorResponse, parseBody, requirePermission } from "@/server/guard";

const schema = z.object({
  type: z.enum(["VACANCIA_PRESIDENTE", "DESIGNAR_NUEVO_VP"]),
  reason: z.enum(["DIMISION_VOLUNTARIA", "SEPARACION_DISCIPLINARIA", "GRADUACION_O_BAJA"]).optional(),
  justification: z.string().trim().max(2000).optional(),
  successorCandidateId: z.string().trim().min(1).optional(),
  councilAttendancePct: z.number().min(0).max(100).optional(),
  councilVotesInFavorPct: z.number().min(0).max(100).optional(),
});

/** Vacantes y sucesión en el Secretariado (Arts. 99-102). */
export async function POST(request: Request) {
  const guard = await requirePermission("PROCLAIM_RESULTS");
  if (!guard.ok) return guard.response;
  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const composition = await handleVacancy(guard.user, body.data);
    return NextResponse.json({
      ok: true,
      message:
        body.data.type === "VACANCIA_PRESIDENTE"
          ? `Vacante procesada. Nuevo presidente: ${composition.president.fullName} (versión ${composition.version}).`
          : `Nueva vicepresidencia: ${composition.vicePresident?.fullName} (versión ${composition.version}).`,
      composition,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
