import { NextResponse } from "next/server";
import { z } from "zod";
import { designateVicePresident } from "@/server/election-service";
import { errorResponse, parseBody, requirePermission } from "@/server/guard";

const schema = z.object({ candidateId: z.string().trim().min(1) });

/** Designación del vicepresidente entre los electos (Art. 67). */
export async function POST(request: Request) {
  const guard = await requirePermission("DESIGNATE_VICE_PRESIDENT");
  if (!guard.ok) return guard.response;
  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const composition = await designateVicePresident(guard.user, body.data.candidateId);
    return NextResponse.json({
      ok: true,
      message: `Vicepresidente designado: ${composition.vicePresident?.fullName ?? body.data.candidateId}.`,
      designatedVpId: body.data.candidateId,
      composition,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
