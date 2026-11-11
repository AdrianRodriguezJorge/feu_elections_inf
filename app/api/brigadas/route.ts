import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

const DEFAULT_BRIGADES = [
  { code: "11", name: "Brigada 11 - 4to Año", active: true, memberCount: 2 },
  { code: "12", name: "Brigada 12 - 3er/4to Año", active: true, memberCount: 3 },
  { code: "22", name: "Brigada 22 - 2do/3er Año", active: true, memberCount: 4 },
  { code: "32", name: "Brigada 32 - 1er/2do Año", active: true, memberCount: 0 },
  { code: "41", name: "Brigada 41 - 4to Año", active: true, memberCount: 29 },
];

/**
 * Endpoint para consultar las brigadas preexistentes de la Facultad (RGF-34).
 */
export async function GET() {
  try {
    const dbBrigades = await prisma.brigade.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { code: "asc" },
    });

    if (dbBrigades.length > 0) {
      return NextResponse.json({
        source: "database",
        count: dbBrigades.length,
        brigades: dbBrigades.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name ?? `Brigada ${b.code}`,
          active: b.active,
          memberCount: b._count.memberships,
        })),
      });
    }
  } catch {
    // Fallback si la base de datos no está disponible
  }

  return NextResponse.json({
    source: "default",
    count: DEFAULT_BRIGADES.length,
    brigades: DEFAULT_BRIGADES,
  });
}
