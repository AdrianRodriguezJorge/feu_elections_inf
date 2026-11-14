import { NextRequest, NextResponse } from "next/server";
import {
  CommissionConstitutionParams,
  validateCommissionConstitution,
} from "@/domain/commission";
import { prisma } from "@/server/db";
import { requirePermission, requireSession } from "@/server/guard";

const DEFAULT_ACTIVE_BRIGADES = ["11", "12", "22", "32", "41"];

export async function GET() {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  try {
    const commission = await prisma.commission.findFirst({
      include: {
        seats: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (commission) {
      return NextResponse.json({
        source: "database",
        commission: {
          id: commission.id,
          processId: commission.processId,
          presidentId: commission.presidentId,
          vicePresidentId: commission.vicePresidentId,
          acta: commission.acta,
          constitutedAt: commission.constitutedAt,
          seats: commission.seats.map((s) => ({
            userId: s.userId,
            name: s.user.name,
            role: s.role,
          })),
        },
      });
    }
  } catch {
    // DB no disponible
  }

  return NextResponse.json({
    source: "default",
    status: "PENDIENTE_CONSTITUCION",
    message: "La Comisión Electoral de la Facultad está pendiente de constitución formal.",
    requiredRoles: {
      president: "1 Presidente",
      vicePresident: "1 Vicepresidente",
      representatives: "1 representante por cada brigada activa (Art. 47)",
    },
    activeBrigades: DEFAULT_ACTIVE_BRIGADES,
  });
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission("CONSTITUTE_COMMISSION");
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json()) as CommissionConstitutionParams;

    // Obtener códigos de brigadas activas para validar
    const activeBrigades = body.activeBrigadeCodes?.length
      ? body.activeBrigadeCodes
      : DEFAULT_ACTIVE_BRIGADES;

    const validation = validateCommissionConstitution({
      ...body,
      activeBrigadeCodes: activeBrigades,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, errors: validation.errors },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Comisión Electoral validada y lista para registro formal con acta de constitución.",
      constitution: {
        presidentUserId: body.presidentUserId,
        vicePresidentUserId: body.vicePresidentUserId,
        representativesCount: body.representatives.length,
        actaPreview: body.actaText.slice(0, 100) + "...",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo de solicitud inválido o malformado." },
      { status: 400 },
    );
  }
}
