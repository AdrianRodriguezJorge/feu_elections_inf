"use client";

import { useState } from "react";
import { Eye, RefreshCw, Check, Search, ClipboardList, ShieldCheck } from "lucide-react";
import { ReceiptVerifierModal } from "@/components/ReceiptVerifierModal";

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
  candidacyHash: _candidacyHash,
  brigadeTurnout,
  candidatesCount,
  seats,
  onRefresh,
}: ObserverPanelProps) {
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [testReceiptHash, setTestReceiptHash] = useState("");

  const brigadesStats = Object.fromEntries(
    brigadeTurnout.map((b) => [b.code, { total: b.total, voted: b.voted }]),
  ) as Record<string, { total: number; voted: number }>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Encabezado de Observación Electoral */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-800">
                <Eye className="h-4 w-4 text-blue-700" strokeWidth={2} />
              </span>
              <h2 className="text-xl font-bold text-feu-green-900">
                Panel de Observación y Transparencia Estudiantil
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Acceso en tiempo real al monitoreo de la jornada electoral, integridad de la urna ciega y participación conforme al Art. 43 h del ABC de la FEU.
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-feu-green-300 bg-white px-3.5 py-2 text-xs font-semibold text-feu-green-900 hover:bg-feu-green-50 shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-feu-green-800" strokeWidth={2} />
            <span>Actualizar Datos</span>
          </button>
        </div>

        {/* Tarjetas de Métricas de Observación */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-xs text-gray-500">Estado de la Elección</p>
            <p className="text-lg font-bold text-feu-green-900">{status}</p>
            <p className="text-[11px] text-gray-400">
              {status === "ABIERTA" ? "Urna recibiendo sufragios" : "Proceso sellado/cerrado"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-xs text-gray-500">Membresía Habilitada</p>
            <p className="text-2xl font-bold text-feu-green-900">{totalEligible}</p>
            <p className="text-[11px] text-gray-500">electores en el registro</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-xs text-gray-500">Boletas en Urna</p>
            <p className="text-2xl font-bold text-feu-green-900">{totalVotes}</p>
            <p className="text-[11px] text-gray-400">
              {validBallots} válidas · {annulledBallots} anuladas
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="text-xs text-gray-500">Afluencia Electoral</p>
            <p className="text-2xl font-bold text-feu-green-900">{participationPct} %</p>
            <p className="text-[11px] font-semibold text-feu-green-700">
              {requirementMet ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  Requisito cumplido
                </span>
              ) : (
                `Faltan ${Math.max(0, minVotesRequired - totalVotes)} votos`
              )}
            </p>
          </div>
        </div>

        {/* Barra de Progreso hacia la Participación Requerida */}
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
            <span>Progreso hacia la Participación Requerida (&gt;{minParticipationPercentage} %)</span>
            <span>{totalVotes} de {minVotesRequired} votos necesarios</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-500 ${
                requirementMet ? "bg-emerald-600" : "bg-amber-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  minVotesRequired > 0 ? (totalVotes / minVotesRequired) * 100 : 0,
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Participación Agregada por Brigada (Anonimizada) */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-feu-green-900">
              Participación Agregada por Brigadas
            </h3>
            <p className="text-xs text-gray-500">
              Monitoreo anónimo sin correlación individual para preservar el secreto del voto.
            </p>
          </div>
          <span className="text-xs font-bold text-feu-green-800">
            {Object.keys(brigadesStats).length} Brigadas
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {Object.entries(brigadesStats).map(([brigade, stat]) => {
            const pct = stat.total > 0 ? Math.round((stat.voted / stat.total) * 100) : 0;
            return (
              <div
                key={brigade}
                className="rounded-lg border border-gray-200 bg-gray-50/50 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-feu-green-900">Brigada {brigade}</span>
                  <span className="text-gray-600 font-mono">{pct} %</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-feu-green-700 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Votos: {stat.voted}</span>
                  <span>Total: {stat.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verificación de Integridad de Urna Ciega */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-feu-green-900">
          Verificación de Boletas en la Urna Ciega
        </h3>
        <p className="mt-1 text-xs text-gray-600">
          Como observador acreditado, puedes verificar que cualquier comprobante emitido exista en la urna de forma íntegra e inmutable, sin revelar jamás quién depositó la boleta.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testReceiptHash}
            onChange={(e) => setTestReceiptHash(e.target.value)}
            placeholder="Introduce el código de comprobante para auditar..."
            className="flex-1 rounded-lg border border-gray-300 p-2.5 font-mono text-xs text-gray-900 focus:border-feu-green-700 focus:outline-hidden"
          />
          <button
            onClick={() => {
              if (!testReceiptHash.trim()) {
                alert("Introduce un código hash de comprobante.");
                return;
              }
              setVerifierOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-feu-green-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-feu-green-800"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Auditar Boleta</span>
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 p-4 border border-gray-200 text-xs text-gray-600 space-y-2">
          <p className="flex items-start gap-1.5">
            <ClipboardList className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" strokeWidth={2} />
            <span>
              <strong>Escaños en disputa:</strong> {seats} puestos derivados de {candidatesCount} candidaturas postuladas (Art. 59: N = C − 2).
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <ShieldCheck className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" strokeWidth={2} />
            <span>
              <strong>Secreto del voto:</strong> las boletas se guardan sin el nombre, el carnet ni la hora de quien votó. El registro de participación solo indica quién ya votó, no qué boleta depositó.
            </span>
          </p>
        </div>
      </div>

      {/* Modal de Verificación de Boleta */}
      {verifierOpen && (
        <ReceiptVerifierModal
          receiptHash={testReceiptHash}
          onClose={() => setVerifierOpen(false)}
        />
      )}
    </div>
  );
}
