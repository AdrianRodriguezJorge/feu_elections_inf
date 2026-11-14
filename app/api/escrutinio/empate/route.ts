import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveTieByCommission } from "@/server/election-service";
import { errorResponse, parseBody, requirePermission } from "@/server/guard";

const schema = z.object({
  electedIds: z.array(z.string().min(1)).max(50).optional(),
  presidentId: z.string().min(1).optional(),
  justification: z.string().trim().min(10, "Explique el motivo de la decisión (al menos 10 caracteres)."),
  acta: z.string().trim().min(3, "Indique el número o la referencia del acta de la Comisión."),
});

/**
 * La Comisión resuelve un empate que los votos de presidente no resolvieron.
 * Solo puede elegir entre los empatados; queda en el acta y en la auditoría.
 */
export async function POST(request: Request) {
  const guard = await requirePermission("PROCLAIM_RESULTS");
  if (!guard.ok) return guard.response;
  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  const { electedIds, presidentId, justification, acta } = body.data;
  try {
    const result = await resolveTieByCommission(
      guard.user,
      { ...(electedIds ? { electedIds } : {}), ...(presidentId ? { presidentId } : {}) },
      justification,
      acta,
    );
    return NextResponse.json({ ok: true, message: "Empate resuelto y resultados proclamados.", tally: result });
  } catch (err) {
    return errorResponse(err);
  }
}
