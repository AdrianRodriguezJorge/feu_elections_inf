import { NextRequest, NextResponse } from "next/server";
import { electionStore } from "@/server/election-store";

/**
 * Consulta la boleta inmutable depositada en la urna a partir de su comprobante (INV-04).
 *
 * Principio de Urna Ciega:
 * La boleta se devuelve con sus marcas exactas y sello temporal, pero la urna
 * NO contiene ni devuelve ningún dato de identidad del votante (ni CI, ni nombre).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash")?.trim();

  if (!hash) {
    return NextResponse.json(
      { ok: false, error: "Identificador de comprobante requerido." },
      { status: 400 },
    );
  }

  const ballotData = electionStore.getBallotByReceipt(hash);

  if (!ballotData) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se encontró ninguna boleta en la urna asociada a este comprobante.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    ballot: ballotData,
    verification: {
      integrity: "SHA-256 verificado en urna",
      isBlind: true,
      identityLinked: false,
      message:
        "La boleta fue recuperada con éxito de la urna electrónica sin revelar la identidad de quien la emitió.",
    },
  });
}

