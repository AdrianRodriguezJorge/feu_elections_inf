"use client";

import { X } from "lucide-react";
import { ProcessCandidateSnapshot } from "@/domain/candidates";

interface BiographyModalProps {
  candidate: ProcessCandidateSnapshot | null;
  onClose: () => void;
}

export function BiographyModal({ candidate, onClose }: BiographyModalProps) {
  if (!candidate) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-xl border border-feu-green-300 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-feu-green-200 pb-3">
          <div>
            <h3 className="text-xl font-bold text-feu-green-900">
              #{candidate.ballotPosition} · {candidate.fullName}
            </h3>
            <p className="text-xs text-feu-green-700 mt-0.5">
              Brigada {candidate.brigadeCode} · CI: {candidate.ci}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="my-4 max-h-72 overflow-y-auto rounded-lg bg-feu-green-50/50 p-4 text-sm text-feu-green-900">
          <h4 className="mb-2 font-semibold text-feu-green-800">
            Biografía y Trayectoria Estudiantil:
          </h4>
          <p className="whitespace-pre-line leading-relaxed">
            {candidate.biographyMd || "Sin biografía cargada."}
          </p>
        </div>

        <div className="flex flex-col gap-1 border-t border-feu-green-200 pt-3 text-[11px] text-gray-500">
          <p>
            <strong>Integridad:</strong> Biografía oficial verificada y validada por la Comisión Electoral.
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-feu-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-feu-green-800"
          >
            Entendido / Regresar a la boleta
          </button>
        </div>
      </div>
    </div>
  );
}

