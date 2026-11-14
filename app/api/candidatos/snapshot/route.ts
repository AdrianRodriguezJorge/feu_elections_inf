import { NextRequest, NextResponse } from "next/server";
import { buildCandidacySnapshot, CandidateInput } from "@/domain/candidates";
import { requirePermission } from "@/server/guard";

/**
 * Valida la lista de candidatos y genera el snapshot criptográfico congelado (F3).
 */
export async function POST(request: NextRequest) {
  const guard = await requirePermission("MANAGE_CANDIDATES");
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json()) as { candidates?: CandidateInput[] };
    const candidates = body.candidates ?? [];

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "La lista de candidatos está vacía o es inválida." },
        { status: 400 },
      );
    }

    const outcome = buildCandidacySnapshot(candidates);

    return NextResponse.json(outcome, { status: outcome.valid ? 200 : 422 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo de petición inválido." },
      { status: 400 },
    );
  }
}

