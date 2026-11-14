import { NextResponse } from "next/server";
import { z } from "zod";
import { electionStore } from "@/server/election-store";
import { parseBody, requirePermission } from "@/server/guard";
import { checkRateLimit } from "@/server/rate-limiter";

const ballotSchema = z.object({
  selections: z
    .array(
      z.object({
        processCandidateId: z.string().min(1).max(64),
        member: z.boolean(),
        president: z.boolean(),
      }),
    )
    .max(200),
  isAnnulled: z.boolean().default(false),
});

/**
 * Emite la boleta del elector autenticado (F4).
 *
 *  - La identidad sale de la sesión; el cuerpo solo trae las marcas.
 *  - Urna ciega: la boleta no guarda identidad ni hora exacta (INV-04).
 *  - Un solo voto por elector (INV-06 / RGF-25).
 */
export async function POST(request: Request) {
  const guard = await requirePermission("CAST_BALLOT");
  if (!guard.ok) return guard.response;
  const { user } = guard;

  const rateCheck = checkRateLimit(`vote:${user.ci}`, 10, 60_000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: `Demasiados intentos. Espera ${rateCheck.resetSeconds} segundos.` },
      { status: 429, headers: { "Retry-After": String(rateCheck.resetSeconds) } },
    );
  }

  const body = await parseBody(request, ballotSchema);
  if (!body.ok) return body.response;

  try {
    const result = await electionStore.castBallot(user.ci, user.role, body.data.selections, body.data.isAnnulled);
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      message:
        result.status === "VALIDA"
          ? "Tu voto quedó registrado en la urna."
          : "Tu boleta anulada quedó registrada en la urna.",
      receiptHash: result.receiptHash,
      ballotStatus: result.status,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No pudimos registrar tu voto y no se ha contado. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
