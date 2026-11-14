import { NextResponse } from "next/server";
import { z } from "zod";
import { resetActivation } from "@/server/accounts";
import { electionStore } from "@/server/election-store";
import { parseBody, requirePermission } from "@/server/guard";

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

  await electionStore.ensureReady();
  const result = await resetActivation(body.data.ci, electionStore.status);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  await electionStore.recordAudit(guard.user.ci, guard.user.role, "CUENTA_RESTABLECIDA", {
    electorCi: body.data.ci,
  });

  return NextResponse.json({
    ok: true,
    message: `Cuenta de ${result.name} restablecida. El elector debe activarla de nuevo.`,
  });
}
