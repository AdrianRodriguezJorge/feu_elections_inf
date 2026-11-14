import { NextResponse } from "next/server";
import { z } from "zod";
import { resetActivation } from "@/server/accounts";
import { getProcessStatus, recordAudit } from "@/server/election-service";
import { errorResponse, parseBody, requirePermission } from "@/server/guard";

const resetSchema = z.object({
  ci: z.string().trim().regex(/^\d{11}$/, "El carnet de identidad tiene 11 dígitos."),
});

/**
 * Restablece la activación de un elector que reporta que otra persona activó
 * su cuenta. Solo Comisión o Administrador, y antes de abrir la votación.
 */
export async function POST(request: Request) {
  const guard = await requirePermission("MANAGE_ACCOUNTS");
  if (!guard.ok) return guard.response;

  const body = await parseBody(request, resetSchema);
  if (!body.ok) return body.response;

  try {
    const result = await resetActivation(body.data.ci, await getProcessStatus());
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    await recordAudit(guard.user.ci, guard.user.role, "CUENTA_RESTABLECIDA", { electorCi: body.data.ci });
    return NextResponse.json({ ok: true, message: `Cuenta de ${result.name} restablecida. El elector debe activarla de nuevo.` });
  } catch (err) {
    return errorResponse(err);
  }
}
