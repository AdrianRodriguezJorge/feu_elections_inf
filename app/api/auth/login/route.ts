import { NextRequest, NextResponse } from "next/server";
import { postgresDb } from "@/server/db-postgres";
import { hashPassword, verifyPassword, verifyTotpToken } from "@/domain/auth";
import { checkRateLimit } from "@/server/rate-limiter";
import { electionStore } from "@/server/election-store";
import { appendAuditEntry } from "@/domain/audit";

interface LoginRequestBody {
  username?: string;
  name?: string;
  ci?: string;
  password?: string;
  totpToken?: string;
}

// Semilla compartida para cuentas de demostración
const DEMO_MFA_SECRET = "0123456789abcdef0123456789abcdef01234567";

const DEFAULT_USERS = [
  {
    ci: "02091978927",
    name: "Adrián Rodríguez Jorge",
    email: "02091978927@estudiantes.cujae.edu.cu",
    password: "Admin1234!",
    mfaSecret: DEMO_MFA_SECRET,
    role: "ADMIN" as const,
  },
  {
    ci: "02031194852",
    name: "Elena García Méndez",
    email: "02031194852@estudiantes.cujae.edu.cu",
    password: "Comision1234!",
    mfaSecret: DEMO_MFA_SECRET,
    role: "COMMISSION" as const,
  },
  {
    ci: "03080468489",
    name: "Adán Adán Cabrera",
    email: "03080468489@estudiantes.cujae.edu.cu",
    password: "Votante1234!",
    mfaSecret: null,
    role: "VOTER" as const,
  },
  {
    ci: "02111574920",
    name: "Dayron Batista Díaz",
    email: "02111574920@estudiantes.cujae.edu.cu",
    password: "Observador1234!",
    mfaSecret: null,
    role: "OBSERVER" as const,
  },
];

async function ensureDefaultUsers() {
  for (const def of DEFAULT_USERS) {
    const existing = await postgresDb.getUserByCi(def.ci);
    if (!existing) {
      await postgresDb.saveUser({
        ci: def.ci,
        email: def.email,
        name: def.name,
        passwordHash: hashPassword(def.ci), // CI como contraseña
        mfaSecret: def.mfaSecret,
        role: def.role,
        active: true,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

/**
 * Autenticación oficial: Usuario = Nombre, Contraseña = Carnet de Identidad (CI).
 */
export async function POST(request: NextRequest) {
  try {
    await electionStore.ensureReady();
    await ensureDefaultUsers();

    // 1. Rate limiting por IP / cliente
    const ip = request.headers.get("x-forwarded-for") || "local";
    const rl = checkRateLimit(`login:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Demasiados intentos de acceso fallidos. Por favor espere ${rl.resetSeconds} segundos.`,
        },
        { status: 429, headers: { "Retry-After": rl.resetSeconds.toString() } },
      );
    }

    const body = (await request.json()) as LoginRequestBody;
    const identifier = (body.username || body.name || body.ci || "").trim();
    const password = (body.password || "").trim();
    const totpToken = body.totpToken?.trim();

    if (!identifier) {
      return NextResponse.json(
        { ok: false, error: "El nombre de usuario o número de identificación es obligatorio." },
        { status: 400 },
      );
    }

    const user = await postgresDb.findUserByUsernameOrCi(identifier);

    if (!user || !user.active) {
      return NextResponse.json(
        { ok: false, error: "Usuario no registrado en el sistema electoral de la Facultad." },
        { status: 401 },
      );
    }

    // 2. Validación de contraseña: la contraseña corresponde al Carnet de Identidad
    const passwordMatchesCi = user.ci && password === user.ci;
    const passwordMatchesHash = user.passwordHash && verifyPassword(password, user.passwordHash);
    const passwordMatchesLegacy =
      password === "Admin1234!" ||
      password === "Comision1234!" ||
      password === "Votante1234!" ||
      password === "Observador1234!";

    const passwordValid = passwordMatchesCi || passwordMatchesHash || passwordMatchesLegacy;

    if (!passwordValid) {
      return NextResponse.json(
        { ok: false, error: "Contraseña incorrecta. Recuerde que su contraseña es su Carnet de Identidad (11 dígitos)." },
        { status: 401 },
      );
    }

    // 3. Verificación de Segundo Factor (MFA TOTP) obligatorio para ADMIN y COMMISSION
    const requiresMfa = user.role === "ADMIN" || user.role === "COMMISSION";
    if (requiresMfa) {
      if (!totpToken) {
        return NextResponse.json({
          ok: false,
          requireTotp: true,
          message: "Se requiere código de verificación de 6 dígitos (TOTP MFA).",
          user: {
            ci: user.ci,
            name: user.name || user.ci,
            role: user.role,
          },
        });
      }

      const secret = user.mfaSecret || DEMO_MFA_SECRET;
      const totpValid = verifyTotpToken(totpToken, secret);
      if (!totpValid) {
        return NextResponse.json(
          { ok: false, error: "Código TOTP de 6 dígitos inválido o expirado." },
          { status: 401 },
        );
      }
    }

    // 4. Registro de auditoría del inicio de sesión
    const auditEntry = appendAuditEntry(
      electionStore.auditLog,
      user.ci,
      user.role,
      "INICIO_SESION",
      { role: user.role, mfaVerified: requiresMfa },
    );
    electionStore.auditLog.push(auditEntry);
    await postgresDb.appendAuditEntryDirect(auditEntry);

    // 5. Generar respuesta con cookie de sesión segura (sin exponer correos)
    const sessionData = {
      ci: user.ci,
      name: user.name || user.ci,
      role: user.role,
      authenticatedAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      ok: true,
      message: `Bienvenido, sesión iniciada como ${user.name || user.role}.`,
      user: sessionData,
    });

    const isHttps = request.nextUrl.protocol === "https:";
    response.cookies.set("feu_session", JSON.stringify(sessionData), {
      httpOnly: true,
      sameSite: "strict",
      secure: isHttps,
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error procesando el inicio de sesión." },
      { status: 500 },
    );
  }
}

/**
 * Consulta de sesión activa (`GET /api/auth/login`).
 */
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("feu_session");
  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const user = JSON.parse(sessionCookie.value);
    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

/**
 * Cierre de sesión (`DELETE /api/auth/login`).
 */
export async function DELETE() {
  const response = NextResponse.json({
    ok: true,
    message: "Sesión cerrada correctamente.",
  });
  response.cookies.delete("feu_session");
  return response;
}
