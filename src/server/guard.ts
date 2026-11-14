/**
 * Autorización en los route handlers.
 *
 * Toda ruta que lee datos no públicos o cambia estado llama a `requireSession`
 * o `requirePermission`. La identidad sale siempre de la sesión firmada, nunca
 * del cuerpo de la petición.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { Action, hasPermission } from "@/domain/permissions";
import type { SessionUser } from "@/lib/session-user";

export type GuardResult = { ok: true; user: SessionUser } | { ok: false; response: NextResponse };

export async function requireSession(): Promise<GuardResult> {
  const session = await auth();
  const user = session?.user;
  if (!user?.ci || !user.role) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Debes iniciar sesión." }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export async function requirePermission(action: Action): Promise<GuardResult> {
  const result = await requireSession();
  if (!result.ok) return result;
  if (!hasPermission(result.user.role, action)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Tu rol no tiene permiso para realizar esta acción." },
        { status: 403 },
      ),
    };
  }
  return result;
}

/**
 * Lee y valida el cuerpo JSON contra un esquema Zod.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "El cuerpo de la petición no es JSON válido." }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Datos de la petición no válidos.", issues: parsed.error.issues.map((i) => i.message) },
        { status: 422 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
