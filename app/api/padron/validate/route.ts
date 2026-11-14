import { NextRequest, NextResponse } from "next/server";
import { parseAndValidatePadronCSV } from "@/domain/padron";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/guard";

const DEFAULT_BRIGADE_CODES = ["11", "12", "22", "32", "41"];

/**
 * Validador atómico de archivos CSV de padrón (EF-22, EF-23).
 *
 * Acepta el contenido CSV en el cuerpo de la petición (texto plano o JSON con campo csv).
 * Comprueba brigadas preexistentes en la base de datos (con fallback a las brigadas de la demo).
 */
export async function POST(request: NextRequest) {
  const guard = await requirePermission("IMPORT_PADRON");
  if (!guard.ok) return guard.response;

  let csvText = "";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { csv?: string };
    csvText = body.csv ?? "";
  } else {
    csvText = await request.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json(
      { ok: false, error: "El contenido CSV enviado está vacío." },
      { status: 400 },
    );
  }

  // Obtener códigos de brigada preexistentes (RGF-34)
  let knownBrigadeCodes = DEFAULT_BRIGADE_CODES;
  const existingMemberCIs = new Set<string>();

  try {
    const dbBrigades = await prisma.brigade.findMany({
      where: { active: true },
      select: { code: true },
    });
    if (dbBrigades.length > 0) {
      knownBrigadeCodes = dbBrigades.map((b) => b.code);
    }

    const dbMembers = await prisma.membership.findMany({
      select: { studentId: true },
    });
    for (const m of dbMembers) {
      existingMemberCIs.add(m.studentId);
    }
  } catch {
    // Si la DB no está disponible, se valida con los códigos conocidos de la demo
  }

  const result = parseAndValidatePadronCSV(
    csvText,
    knownBrigadeCodes,
    existingMemberCIs,
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
