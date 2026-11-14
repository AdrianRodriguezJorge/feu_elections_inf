import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_PROCESS_CONFIG,
  ProcessConfig,
  resolveProcessConfig,
} from "@/domain/config";
import { requirePermission, requireSession } from "@/server/guard";

// Almacén reactivo de configuración en memoria (con fallback si no hay DB)
let currentConfig: ProcessConfig = { ...DEFAULT_PROCESS_CONFIG };

/**
 * Consulta la configuración actual del proceso electoral (F3).
 */
export async function GET() {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  return NextResponse.json({
    ok: true,
    config: currentConfig,
    defaults: DEFAULT_PROCESS_CONFIG,
  });
}

/**
 * Actualiza la configuración del proceso electoral (solo ADMIN).
 */
export async function POST(request: NextRequest) {
  const guard = await requirePermission("CONFIGURE_PROCESS");
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json()) as Partial<ProcessConfig>;
    const resolution = resolveProcessConfig(body);

    if (!resolution.valid) {
      return NextResponse.json(
        { ok: false, errors: resolution.errors },
        { status: 422 },
      );
    }

    currentConfig = resolution.config;

    return NextResponse.json({
      ok: true,
      message: "Configuración del proceso electoral actualizada exitosamente.",
      config: currentConfig,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo de petición inválido o malformado." },
      { status: 400 },
    );
  }
}
