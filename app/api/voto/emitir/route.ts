import { NextRequest, NextResponse } from "next/server";
import { electionStore } from "@/server/election-store";
import { BallotSelection, UserRole } from "@/domain/types";
import { checkRateLimit } from "@/server/rate-limiter";

/**
 * Emite una boleta en la urna digital (F4).
 *
 * Invariantes de seguridad electoral:
 *  - Urna ciega: la boleta guardada no contiene la identidad ni el CI del elector (INV-04).
 *  - Un solo voto por elector: se consume la participación en el padrón (INV-06 / RGF-25).
 *  - Genera un comprobante criptográfico SHA-256 anónimo (receiptHash).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      voterCi?: string;
      role?: UserRole;
      selections?: BallotSelection[];
      isAnnulled?: boolean;
    };

    const voterCi = body.voterCi?.trim();
    if (!voterCi) {
      return NextResponse.json(
        { ok: false, error: "Identificación del elector requerida (Carnet de Identidad)." },
        { status: 400 },
      );
    }

    // Rate Limiting (Item 7.4)
    const ip = request.headers.get("x-forwarded-for") || "local";
    const rateCheck = checkRateLimit(`vote:${ip}:${voterCi}`, 30, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: `Límite de peticiones alcanzado. Espera ${rateCheck.resetSeconds} segundos.` },
        { status: 429, headers: { "Retry-After": String(rateCheck.resetSeconds) } },
      );
    }

    const role: UserRole = body.role ?? "VOTER";
    const selections = body.selections ?? [];
    const isAnnulled = Boolean(body.isAnnulled);

    const result = await electionStore.castBallot(voterCi, role, selections, isAnnulled);

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      message:
        result.status === "VALIDA"
          ? "Tu voto ha sido depositado exitosamente en la urna secreta."
          : "Tu boleta anulada conscientemente ha sido depositada en la urna.",
      receiptHash: result.receiptHash,
      ballotStatus: result.status,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error interno procesando la emisión del voto." },
      { status: 500 },
    );
  }
}

