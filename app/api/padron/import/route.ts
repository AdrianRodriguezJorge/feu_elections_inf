import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PROCESS_CONFIG } from "@/domain/config";
import { importPadronIncremental, PadronRecord } from "@/domain/padron";
import { prisma } from "@/server/db";
import { electionStore } from "@/server/election-store";
import { ACTIVATION_WINDOW } from "@/server/accounts";
import { requirePermission } from "@/server/guard";

const DEFAULT_BRIGADE_CODES = ["11", "12", "22", "32", "41"];

// Almacén en memoria de miembros importados (para desarrollo y persistencia reactiva)
const inMemoryPadron = new Map<string, PadronRecord>();

/**
 * Consulta el estado actual del padrón y el umbral de votantes requeridos.
 */
export async function GET(request: NextRequest) {
  const guard = await requirePermission("IMPORT_PADRON");
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const minPct = Number(searchParams.get("minPct")) || DEFAULT_PROCESS_CONFIG.minParticipationPercentage;

  let totalMembers = inMemoryPadron.size;
  const membersList: PadronRecord[] = Array.from(inMemoryPadron.values());

  try {
    const count = await prisma.membership.count({ where: { eligible: true } });
    if (count > 0) {
      totalMembers = count;
    }
  } catch {
    // Si la DB no está disponible, se utiliza el almacén en memoria
  }

  const minVotesRequired = Math.floor((totalMembers * minPct) / 100) + 1;

  return NextResponse.json({
    ok: true,
    totalEligible: totalMembers,
    minParticipationPercentage: minPct,
    minVotesRequired: totalMembers > 0 ? minVotesRequired : 0,
    sampleMembers: membersList.slice(0, 10),
  });
}

/**
 * Importación incremental del padrón (merge por CI):
 *  - Omite CIs ya existentes sin abortar el proceso.
 *  - Agrega únicamente los registros nuevos.
 *  - Reporta en tiempo real los votantes necesarios para cumplir el umbral.
 */
export async function POST(request: NextRequest) {
  const guard = await requirePermission("IMPORT_PADRON");
  if (!guard.ok) return guard.response;

  // El padrón es la base del quórum: queda congelado al abrir la votación.
  await electionStore.ensureReady();
  if (!ACTIVATION_WINDOW.includes(electionStore.status)) {
    return NextResponse.json(
      { ok: false, error: `El registro de electores está congelado (estado ${electionStore.status}).` },
      { status: 409 },
    );
  }

  let csvText = "";
  let minPct = DEFAULT_PROCESS_CONFIG.minParticipationPercentage;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { csv?: string; minParticipationPercentage?: number };
    csvText = body.csv ?? "";
    if (body.minParticipationPercentage) {
      minPct = body.minParticipationPercentage;
    }
  } else {
    csvText = await request.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json(
      { ok: false, error: "El archivo o contenido CSV está vacío." },
      { status: 400 },
    );
  }

  let knownBrigades = DEFAULT_BRIGADE_CODES;
  const existingCIs = new Set<string>(inMemoryPadron.keys());

  try {
    const dbBrigades = await prisma.brigade.findMany({
      where: { active: true },
      select: { code: true },
    });
    if (dbBrigades.length > 0) {
      knownBrigades = dbBrigades.map((b) => b.code);
    }

    const dbMembers = await prisma.membership.findMany({
      select: { studentId: true },
    });
    for (const m of dbMembers) {
      existingCIs.add(m.studentId);
    }
  } catch {
    // Modo en memoria
  }

  const result = importPadronIncremental(
    csvText,
    knownBrigades,
    existingCIs,
    minPct,
  );

  if (result.ok) {
    // Persistir nuevos en el almacén en memoria y en PostgreSQL (Item 7.1)
    for (const rec of result.recordsToAdd) {
      inMemoryPadron.set(rec.ci, rec);
      electionStore.padron.set(rec.ci, rec);
      if (!electionStore.participations.has(rec.ci)) {
        electionStore.participations.set(rec.ci, {
          voterCi: rec.ci,
          voterName: rec.fullName,
          brigadeCode: rec.brigadeCode,
          hasVoted: false,
        });
      }
    }

    // Persistir en DB si está activa
    try {
      if (result.recordsToAdd.length > 0) {
        const structure = await prisma.structure.findFirst({ select: { id: true } });
        if (structure) {
          await prisma.membership.createMany({
            data: result.recordsToAdd.map((r) => ({
              structureId: structure.id,
              studentId: r.ci,
              firstName: r.firstName,
              lastName: [r.firstSurname, r.secondSurname].filter(Boolean).join(" "),
              fullName: r.fullName,
              eligible: true,
            })),
            skipDuplicates: true,
          });
        }
      }
    } catch {
      // DB no conectada en este entorno, inMemoryPadron conserva el estado
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}

