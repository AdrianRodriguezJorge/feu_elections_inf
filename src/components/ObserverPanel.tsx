"use client";

import { useState } from "react";
import { Eye, RefreshCw, Check, Search, ClipboardList, ShieldCheck } from "lucide-react";
import { ReceiptVerifierModal } from "@/components/ReceiptVerifierModal";
import { Button } from "@/components/ui/button";
import { formatPct, statusLabel } from "@/lib/status-labels";

interface ObserverPanelProps {
  status: string;
  totalVotes: number;
  totalEligible: number;
  validBallots: number;
  annulledBallots: number;
  participationPct: number;
  minParticipationPercentage: number;
  minVotesRequired: number;
  requirementMet: boolean;
  candidacyHash?: string;
  /** Participación agregada por brigada (el servidor nunca envía el listado de electores). */
  brigadeTurnout: Array<{ code: string; total: number; voted: number }>;
  candidatesCount: number;
  seats: number;
  onRefresh: () => void;
}

export function ObserverPanel({
  status,
  totalVotes,
  totalEligible,
  validBallots,
  annulledBallots,
  participationPct,
  minParticipationPercentage,
  minVotesRequired,
  requirementMet,
  brigadeTurnout,
  candidatesCount,
  seats,
  onRefresh,
}: ObserverPanelProps) {
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [testReceiptHash, setTestReceiptHash] = useState("");
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const missing = Math.max(0, minVotesRequired - totalVotes);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                <Eye className="h-4 w-4 text-blue-800" strokeWidth={2} aria-hidden="true" />
              </span>
              <h2 className="text-xl font-bold text-feu-green-900">Observación de la elección</h2>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              Desde aquí puede seguir la jornada electoral y la participación, conforme al Art. 43 h del ABC de la{" "}
              <span className="font-bold text-feu-carmesi-500">FEU</span>.
            </p>
          </div>
          <Button variant="secondary" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            <span>Actualizar datos</span>
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-sm text-gray-700">Estado de la elección</p>
            <p className="text-lg font-bold text-feu-green-900">{statusLabel(status)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-sm text-gray-700">Electores habilitados</p>
            <p className="text-2xl font-bold text-feu-green-900">{totalEligible}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-sm text-gray-700">Votos emitidos</p>
            <p className="text-2xl font-bold text-feu-green-900">{totalVotes}</p>
            <p className="text-xs text-gray-700">
              {validBallots} válidos · {annulledBallots} anulados
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-sm text-gray-700">Participación</p>
            <p className="text-2xl font-bold text-feu-green-900">{formatPct(participationPct)}</p>
            <p className="text-xs font-semibold text-feu-green-800">
              {requirementMet ? (
                <span className="inline-flex items-center gap-1 text-cujae-green-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Quórum alcanzado
                </span>
              ) : (
                `Faltan ${missing} ${missing === 1 ? "voto" : "votos"}`
              )}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex flex-wrap justify-between gap-1 text-sm font-semibold text-gray-800">
            <span id="obs-progress-label">Avance hacia el quórum (más del {formatPct(minParticipationPercentage)})</span>
            <span>
              {totalVotes} de {minVotesRequired} votos necesarios
            </span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-labelledby="obs-progress-label"
            aria-valuemin={0}
            aria-valuemax={minVotesRequired}
            aria-valuenow={Math.min(totalVotes, minVotesRequired)}
          >
            <div
              className={`h-full transition-all duration-500 ${requirementMet ? "bg-cujae-green-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, minVotesRequired > 0 ? (totalVotes / minVotesRequired) * 100 : 0)}%` }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-feu-green-900">Participación por brigada</h3>
            <p className="text-sm text-gray-700">Solo se muestran totales; no se identifica a ningún elector.</p>
          </div>
          <span className="text-sm font-bold text-feu-green-800">
            {brigadeTurnout.length} {brigadeTurnout.length === 1 ? "brigada" : "brigadas"}
          </span>
        </div>
        {brigadeTurnout.length === 0 ? (
          <p className="mt-4 text-sm text-gray-700">Todavía no hay electores registrados.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {brigadeTurnout.map((b) => {
              const pct = b.total > 0 ? Math.round((b.voted / b.total) * 100) : 0;
              return (
                <li key={b.code} className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50/50 p-3.5">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-feu-green-900">Brigada {b.code}</span>
                    <span className="text-gray-800">{formatPct(pct)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                    <div className="h-full bg-cujae-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-700">
                    Han votado {b.voted} de {b.total}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-feu-green-900">Verificar un comprobante</h3>
        <p className="mt-1 text-sm text-gray-700">
          Puede comprobar que un comprobante corresponde a una boleta depositada en la urna. La verificación nunca revela quién
          votó ni qué votó.
        </p>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setReceiptError(null);
            if (!testReceiptHash.trim()) {
              setReceiptError("Escriba el código del comprobante.");
              return;
            }
            setVerifierOpen(true);
          }}
        >
          <div className="flex-1">
            <label htmlFor="observer-receipt" className="mb-1 block text-sm font-semibold text-gray-800">
              Código del comprobante
            </label>
            <input
              id="observer-receipt"
              type="text"
              value={testReceiptHash}
              onChange={(e) => setTestReceiptHash(e.target.value)}
              aria-invalid={receiptError ? true : undefined}
              aria-describedby={receiptError ? "observer-receipt-error" : undefined}
              className="min-h-11 w-full rounded-lg border border-gray-300 p-2.5 font-mono text-sm text-gray-900 focus:border-cujae-green-500 focus:outline-hidden"
            />
          </div>
          <Button type="submit">
            <Search className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            <span>Verificar comprobante</span>
          </Button>
        </form>
        {receiptError && (
          <p id="observer-receipt-error" role="alert" className="mt-2 text-sm font-medium text-red-800">
            {receiptError}
          </p>
        )}

        <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="flex items-start gap-1.5">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" strokeWidth={2} aria-hidden="true" />
            <span>
              <strong>Puestos a elegir:</strong> {seats}, de {candidatesCount} candidaturas (Art. 59: candidatos menos 2).
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" strokeWidth={2} aria-hidden="true" />
            <span>
              <strong>Secreto del voto:</strong> las boletas se guardan sin el nombre, el carné ni la hora de quien votó. El
              registro de participación solo indica quién ya votó, no qué boleta depositó.
            </span>
          </p>
        </div>
      </section>

      {verifierOpen && <ReceiptVerifierModal receiptHash={testReceiptHash} onClose={() => setVerifierOpen(false)} />}
    </div>
  );
}
