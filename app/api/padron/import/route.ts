import { NextRequest, NextResponse } from "next/server";
import { importPadronIncremental } from "@/domain/padron";
import { ACTIVATION_WINDOW } from "@/server/accounts";
import { prisma } from "@/server/db";
import { getElectionView, getProcessStatus } from "@/server/election-service";
import { errorResponse, requirePermission } from "@/server/guard";

/** Total de electores habilitados y votos necesarios para el quórum vigente. */
export async function GET() {
  const guard = await requirePermission("IMPORT_PADRON");
  if (!guard.ok) return guard.response;
  try {
    const view = await getElectionView();
    const total = view.electors.size;
    return NextResponse.json({
      ok: true,
      totalEligible: total,
      minParticipationPercentage: view.quorumPct,
      minVotesRequired: total > 0 ? Math.floor((total * view.quorumPct) / 100) + 1 : 0,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Importación incremental del padrón (merge por carnet). Solo antes de abrir
 * la votación: el padrón es la base del quórum. Guarda la brigada de cada fila.
 */
export async function POST(request: NextRequest) {
  const guard = await requirePermission("IMPORT_PADRON");
  if (!guard.ok) return guard.response;

  try {
    const status = await getProcessStatus();
    if (!ACTIVATION_WINDOW.includes(status)) {
      return NextResponse.json(
        { ok: false, error: `El registro de electores está congelado (estado ${status}).` },
        { status: 409 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    const csvText = contentType.includes("application/json")
      ? (((await request.json()) as { csv?: string }).csv ?? "")
      : await request.text();
    if (!csvText.trim()) {
      return NextResponse.json({ ok: false, error: "El contenido CSV está vacío." }, { status: 400 });
    }

    const structure = await prisma.structure.findFirst({ where: { type: "FACULTAD" }, select: { id: true } });
    if (!structure) return errorResponse(new Error("Sin estructura de Facultad"));

    const brigades = await prisma.brigade.findMany({ where: { structureId: structure.id, active: true } });
    const brigadeIds = new Map(brigades.map((b) => [b.code, b.id]));
    const existing = new Set(
      (await prisma.membership.findMany({ where: { structureId: structure.id }, select: { studentId: true } })).map((m) => m.studentId),
    );

    const view = await getElectionView();
    const result = importPadronIncremental(csvText, [...brigadeIds.keys()], existing, view.quorumPct);

    if (result.ok && result.recordsToAdd.length > 0) {
      await prisma.membership.createMany({
        data: result.recordsToAdd.map((r) => ({
          structureId: structure.id,
          studentId: r.ci,
          firstName: r.firstName,
          lastName: [r.firstSurname, r.secondSurname].filter(Boolean).join(" "),
          fullName: r.fullName,
          brigadeId: brigadeIds.get(r.brigadeCode) ?? null,
          eligible: true,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return errorResponse(err);
  }
}
