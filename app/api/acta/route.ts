import { NextResponse } from "next/server";
import { RESULTS_PUBLIC_STATUSES } from "@/domain/states";
import { getElectionView } from "@/server/election-service";
import { errorResponse, requirePermission } from "@/server/guard";
import { buildActaData } from "@/server/acta";
import { buildActaPdf } from "@/utils/pdfActa";

export const runtime = "nodejs";

const NOT_PROCLAIMED = ["SIN_QUORUM", "EMPATE", "CONVOCADO", "ABIERTA", "CERRADA"];

/** Acta de escrutinio en PDF, generada en el servidor a partir de los datos persistidos. */
export async function GET() {
  const guard = await requirePermission("VIEW_RESULTS");
  if (!guard.ok) return guard.response;

  try {
    const view = await getElectionView();
    if (guard.user.role === "VOTER" && !RESULTS_PUBLIC_STATUSES.includes(view.status)) {
      return NextResponse.json({ ok: false, error: "Los resultados aún no son públicos." }, { status: 403 });
    }
    if (NOT_PROCLAIMED.includes(view.status) || !view.tallyResult || !view.quorum) {
      return NextResponse.json({ ok: false, error: "No hay resultados proclamados." }, { status: 409 });
    }

    const pdf = buildActaPdf(buildActaData(view));
    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="acta-escrutinio-feu.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
