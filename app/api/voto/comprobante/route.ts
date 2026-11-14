import { NextRequest, NextResponse } from "next/server";
import { electionStore } from "@/server/election-store";
import { checkRateLimit } from "@/server/rate-limiter";
import { clientIp } from "@/server/request";

const RECEIPT_PATTERN = /^[0-9a-f]{64}$/i;

/**
 * Verifica que un comprobante esté en la urna (consulta pública).
 *
 * Solo confirma la inclusión. No devuelve el contenido, el estado ni la hora
 * de la boleta: así el comprobante no sirve para demostrar cómo se votó.
 */
export async function GET(request: NextRequest) {
  const rl = checkRateLimit(`receipt:${clientIp(request.headers)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: `Demasiadas consultas. Espera ${rl.resetSeconds} segundos.` },
      { status: 429, headers: { "Retry-After": String(rl.resetSeconds) } },
    );
  }

  const hash = request.nextUrl.searchParams.get("hash")?.trim() ?? "";
  if (!RECEIPT_PATTERN.test(hash)) {
    return NextResponse.json(
      { ok: false, error: "El comprobante debe tener 64 caracteres (números y letras de la a a la f)." },
      { status: 400 },
    );
  }

  await electionStore.ensureReady();
  const found = electionStore.hasReceipt(hash);

  return NextResponse.json(
    found
      ? { ok: true, found: true, message: "Tu boleta está en la urna y se contará en el escrutinio." }
      : { ok: false, found: false, error: "No hay ninguna boleta en la urna con ese comprobante." },
    { status: found ? 200 : 404 },
  );
}
