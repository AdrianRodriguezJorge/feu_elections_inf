import { NextRequest, NextResponse } from "next/server";
import { generateTotpToken } from "@/domain/auth";
import { postgresDb } from "@/server/db-postgres";

const DEMO_MFA_SECRET = "0123456789abcdef0123456789abcdef01234567";

/**
 * Consulta de código TOTP activo para demostración y verificación (Item 7.2).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ci = searchParams.get("ci")?.trim();

  let secret = DEMO_MFA_SECRET;
  if (ci) {
    try {
      const user = await postgresDb.getUserByCi(ci);
      if (user?.mfaSecret) {
        secret = user.mfaSecret;
      }
    } catch {
      // Ignorar error de consulta y usar DEMO_MFA_SECRET
    }
  }

  const now = Date.now();
  const token = generateTotpToken(secret, now);
  const secondsRemaining = 30 - (Math.floor(now / 1000) % 30);

  return NextResponse.json({
    ok: true,
    token,
    secondsRemaining,
    stepSeconds: 30,
    mfaSecretPreview: secret.slice(0, 10) + "...",
  });
}
