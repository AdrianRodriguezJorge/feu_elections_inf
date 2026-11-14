import { NextResponse } from "next/server";
import { generatePadronTemplateCSV } from "@/domain/padron";
import { requirePermission } from "@/server/guard";

/**
 * Endpoint de descarga de la plantilla oficial de padrón en formato CSV (EF-22).
 */
export async function GET() {
  const guard = await requirePermission("IMPORT_PADRON");
  if (!guard.ok) return guard.response;

  const csv = generatePadronTemplateCSV();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-registro-electores-feu.csv"',
    },
  });
}
