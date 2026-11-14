import { NextRequest, NextResponse } from "next/server";
import { generateTotpToken } from "@/domain/auth";
import { findLoginAccount } from "@/server/accounts";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Código TOTP vigente de una autoridad, SOLO en desarrollo local.
 *
 * Ayuda interina para pruebas manuales mientras se decide el enrolamiento con
 * aplicación autenticadora (pendiente). En producción esta ruta no existe (404).
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development" || !LOCAL_HOSTS.has(request.nextUrl.hostname)) {
    return new NextResponse(null, { status: 404 });
  }

  const identifier = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  const lookup = await findLoginAccount(identifier);
  const secret = lookup.status === "ok" ? lookup.account.mfaSecret : null;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Esa cuenta no tiene segundo factor configurado." }, { status: 404 });
  }

  const now = Date.now();
  return NextResponse.json({
    ok: true,
    token: generateTotpToken(secret, now),
    secondsRemaining: 30 - (Math.floor(now / 1000) % 30),
  });
}
