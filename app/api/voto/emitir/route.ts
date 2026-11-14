import { NextResponse } from "next/server";
import { z } from "zod";
import { castBallot } from "@/server/election-service";
import { errorResponse, parseBody, requirePermission } from "@/server/guard";
import { checkRateLimit } from "@/server/rate-limiter";

const ballotSchema = z.object({
  selections: z
    .array(z.object({ processCandidateId: z.string().min(1).max(64), member: z.boolean(), president: z.boolean() }))
    .max(200),
  isAnnulled: z.boolean().default(false),
});

/**
 * Emite la boleta del elector autenticado. La identidad sale de la sesión;
 * la boleta se guarda sin identidad ni hora exacta (INV-04).
 */
export async function POST(request: Request) {
  const guard = await requirePermission("CAST_BALLOT");
  if (!guard.ok) return guard.response;

  const rateCheck = checkRateLimit(`vote:${guard.user.ci}`, 10, 60_000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: `Demasiados intentos. Espere ${rateCheck.resetSeconds} segundos.` },
      { status: 429, headers: { "Retry-After": String(rateCheck.resetSeconds) } },
    );
  }

  const body = await parseBody(request, ballotSchema);
  if (!body.ok) return body.response;

  try {
    const result = await castBallot(guard.user, body.data.selections, body.data.isAnnulled);
    return NextResponse.json({
      ok: true,
      message: result.status === "VALIDA" ? "Su voto quedó registrado en la urna." : "Su boleta anulada quedó registrada en la urna.",
      receiptHash: result.receiptHash,
      ballotStatus: result.status,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
