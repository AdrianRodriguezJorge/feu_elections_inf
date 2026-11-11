import { NextRequest, NextResponse } from "next/server";
import { hashPassword, validateAccountActivation } from "@/domain/auth";
import { prisma } from "@/server/db";
import { postgresDb } from "@/server/db-postgres";
import { checkRateLimit } from "@/server/rate-limiter";
import { electionStore } from "@/server/election-store";

interface ActivationRequestBody {
  ci: string;
  email?: string;
  password?: string;
}

/**
 * Endpoint de activación de cuenta a partir del listado de electores (F2 / F7).
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (Item 7.4)
    const ip = request.headers.get("x-forwarded-for") || "local";
    const rl = checkRateLimit(`activar:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Demasiados intentos de activación. Por favor espere ${rl.resetSeconds} segundos.`,
        },
        { status: 429, headers: { "Retry-After": rl.resetSeconds.toString() } },
      );
    }

    const body = (await request.json()) as ActivationRequestBody;
    const cleanCi = (body.ci || "").trim();
    const cleanEmail = (body.email || `${cleanCi}@estudiantes.cujae.edu.cu`).trim();
    const cleanPassword = (body.password || cleanCi).trim();

    // Buscar si el miembro existe en el listado de electores (PostgreSQL)
    let membership: {
      id: string;
      studentId: string;
      fullName: string;
      eligible: boolean;
      userId: string | null;
    } | null = null;

    try {
      const dbMem = await prisma.membership.findFirst({
        where: { studentId: cleanCi },
        select: {
          id: true,
          studentId: true,
          fullName: true,
          eligible: true,
          userId: true,
        },
      });
      membership = dbMem;
    } catch {
      // Búsqueda en el listado de electores de la tienda en memoria
      const elector = electionStore.padron.get(cleanCi);
      if (elector) {
        const existingUser = await postgresDb.getUserByCi(cleanCi);
        membership = {
          id: "mem-" + elector.ci,
          studentId: elector.ci,
          fullName: elector.fullName,
          eligible: true,
          userId: existingUser ? existingUser.ci : null,
        };
      }
    }

    const validation = validateAccountActivation({
      ci: cleanCi,
      email: cleanEmail,
      password: cleanPassword,
      membership,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, errors: validation.errors },
        { status: 422 },
      );
    }

    const passwordHash = hashPassword(cleanPassword);

    const userRecord = {
      ci: cleanCi,
      email: cleanEmail,
      name: membership?.fullName,
      passwordHash,
      mfaSecret: null,
      role: "VOTER" as const,
      active: true,
      createdAt: new Date().toISOString(),
    };

    await postgresDb.saveUser(userRecord);

    return NextResponse.json({
      ok: true,
      message: `Cuenta activada exitosamente para ${membership?.fullName}. Ya puede iniciar sesión como VOTER.`,
      user: {
        email: cleanEmail,
        name: membership?.fullName,
        role: "VOTER",
        membershipId: membership?.id,
        passwordHashPreview: passwordHash.slice(0, 20) + "...",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Solicitud de activación inválida." },
      { status: 400 },
    );
  }
}
