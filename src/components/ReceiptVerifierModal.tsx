"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, Star, Lock } from "lucide-react";

interface BallotSelectionEnriched {
  candidateId: string;
  candidateName: string;
  brigadeCode: string;
  member: boolean;
  president: boolean;
}

interface VerifiedBallot {
  receiptHash: string;
  status: "VALIDA" | "ANULADA_POR_ELECTOR";
  castAt: string;
  selections: BallotSelectionEnriched[];
}

interface ReceiptVerifierModalProps {
  receiptHash: string;
  onClose: () => void;
}

export function ReceiptVerifierModal({
  receiptHash,
  onClose,
}: ReceiptVerifierModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ballot, setBallot] = useState<VerifiedBallot | null>(null);

  useEffect(() => {
    async function fetchBallot() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/voto/comprobante?hash=${encodeURIComponent(receiptHash)}`);
        const data = await res.json();
        if (res.ok) {
          setBallot(data.ballot);
        } else {
          setError(data.error || "No se encontró la boleta.");
        }
      } catch {
        setError("Error de comunicación con la urna digital.");
      } finally {
        setLoading(false);
      }
    }
    fetchBallot();
  }, [receiptHash]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Verificación de Boleta en la Urna
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Auditoría pública desacoplada sin revelación de identidad
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Contenido */}
        <div className="my-4 max-h-96 overflow-y-auto space-y-3">
          {loading && (
            <div className="py-8 text-center text-sm text-gray-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#136D54] border-r-transparent" />
              <p className="mt-2 text-xs">Localizando boleta en la urna electrónica...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-xs font-medium text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {ballot && (
            <>
              {/* Resumen de la Boleta */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-600">Estado en Urna:</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold uppercase text-[10px] ${
                      ballot.status === "VALIDA"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {ballot.status === "VALIDA" ? "Boleta Válida" : "Anulada por el Elector"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Sello temporal de depósito:</span>
                  <span className="font-mono text-[11px] text-gray-800">
                    {new Date(ballot.castAt).toLocaleString("es-CU")}
                  </span>
                </div>
                <div className="pt-1 border-t border-emerald-100 text-[10px] font-mono break-all text-gray-500">
                  Hash: {ballot.receiptHash}
                </div>
              </div>

              {/* Contenido de la Boleta */}
              {ballot.status === "VALIDA" ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Selecciones Registradas en la Urna:
                  </h4>

                  {/* Presidente */}
                  {ballot.selections.find((s) => s.president) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1 text-[10px] uppercase">
                        <Star className="h-3.5 w-3.5 fill-amber-700 text-amber-700" strokeWidth={2} />
                        <span>Presidente Seleccionado:</span>
                      </span>
                      <span className="font-bold text-gray-900">
                        {ballot.selections.find((s) => s.president)?.candidateName}
                      </span>
                      <span className="text-gray-500 text-[11px] ml-1">
                        (Brigada {ballot.selections.find((s) => s.president)?.brigadeCode})
                      </span>
                    </div>
                  )}

                  {/* Miembros */}
                  <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
                    <span className="font-semibold text-gray-700 block mb-1.5 text-[11px]">
                      Miembros Marcados ({ballot.selections.filter((s) => s.member).length}):
                    </span>
                    <ul className="divide-y divide-gray-100 space-y-1">
                      {ballot.selections
                        .filter((s) => s.member)
                        .map((s) => (
                          <li key={s.candidateId} className="flex justify-between py-1">
                            <span className="font-medium text-gray-800">{s.candidateName}</span>
                            <span className="font-mono text-gray-500 text-[11px]">
                              Brigada {s.brigadeCode}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <p className="font-bold">Boleta sin marcas para candidatos:</p>
                  <p className="mt-1 text-gray-600">
                    Esta boleta fue depositada conscientemente en blanco/anulada. Cuenta para la participación requerida de la facultad, pero no asignó votos a ningún candidato.
                  </p>
                </div>
              )}

              {/* Cláusula de Privacidad e Inviolabilidad */}
              <div className="rounded-lg bg-gray-50 p-3 text-[11px] text-gray-500 border border-gray-100 leading-relaxed flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  <strong>Garantía de Secreto del Voto:</strong> La urna almacena la boleta con su comprobante de forma completamente desacoplada del registro de electores. No existe ningún registro ni identificador que vincule esta boleta con el Carnet de Identidad de quien la emitió.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Pie */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#136D54] px-4 py-2 text-xs font-bold text-white hover:bg-[#0C4B39]"
          >
            Cerrar Consulta
          </button>
        </div>
      </div>
    </div>
  );
}

