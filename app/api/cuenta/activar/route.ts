import { NextResponse } from "next/server";
import { z } from "zod";
import { activateAccount } from "@/server/accounts";
import { getProcessStatus, recordAudit } from "@/server/election-service";
import { errorResponse, parseBody } from "@/server/guard";
import { checkRateLimit } from "@/server/rate-limiter";
import { clientIp } from "@/server/request";

const activationSchema = z.object({
  ci: z.string().trim().regex(/^\d{11}$/, "El carnet de identidad tiene 11 dígitos."),
  password: z.string().min(1).max(128),
});

/**
 * Activación de la cuenta del elector con su carnet y una contraseña propia.
 */
export async function POST(request: Request) {
  const rl = checkRateLimit(`activar:${clientIp(request.headers)}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: `Demasiados intentos. Espera ${rl.resetSeconds} segundos.` },
      { status: 429, headers: { "Retry-After": String(rl.resetSeconds) } },
    );
  }

  const body = await parseBody(request, activationSchema);
  if (!body.ok) return body.response;
  const { ci, password } = body.data;

  try {
    const result = await activateAccount(ci, password, await getProcessStatus());
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    await recordAudit(ci, "VOTER", "CUENTA_ACTIVADA", {});
    return NextResponse.json({
      ok: true,
      message: `Cuenta activada, ${result.name}. Ya puedes iniciar sesión con tu carnet y tu nueva contraseña.`,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
