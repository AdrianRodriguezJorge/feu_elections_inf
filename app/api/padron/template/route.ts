import { NextResponse } from "next/server";
import { generatePadronTemplateCSV } from "@/domain/padron";

/**
 * Endpoint de descarga de la plantilla oficial de padrón en formato CSV (EF-22).
 */
export async function GET() {
  const csv = generatePadronTemplateCSV();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-registro-electores-feu.csv"',
    },
  });
}
