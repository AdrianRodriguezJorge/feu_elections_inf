import { NextResponse } from "next/server";
import { z } from "zod";
import { FACULTY_QUORUM_PCT, MIN_QUORUM_EXCEPTION_PCT, setQuorumException } from "@/server/election-service";
import { errorResponse, parseBody, requirePermission } from "@/server/guard";

const schema = z.object({
  pct: z.number().min(MIN_QUORUM_EXCEPTION_PCT).max(FACULTY_QUORUM_PCT),
  justification: z.string().trim().min(10, "Explique por qué se aprueba la excepción (al menos 10 caracteres)."),
  acta: z.string().trim().min(3, "Indique el acta o la resolución que aprueba la excepción."),
});

/**
 * Excepción de quórum aprobada (80-85 %). Solo el Administrador, hasta antes
 * del escrutinio, con acta. 85 % vuelve a la regla general del Art. 38.
 */
export async function POST(request: Request) {
  const guard = await requirePermission("CONFIGURE_PROCESS");
  if (!guard.ok) return guard.response;
  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  try {
    await setQuorumException(guard.user, body.data.pct, body.data.justification, body.data.acta);
    return NextResponse.json({
      ok: true,
      message:
        body.data.pct === FACULTY_QUORUM_PCT
          ? "Quórum restablecido a más del 85 %."
          : `Excepción aplicada: la elección será válida con más del ${body.data.pct} % de participación.`,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
