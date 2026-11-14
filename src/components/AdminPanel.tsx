"use client";

import { useState } from "react";
import { Play, Square, Check, AlertTriangle, Lock } from "lucide-react";
import { ProcessCandidateSnapshot } from "@/domain/candidates";
import { BiographyModal } from "./BiographyModal";

export interface QuorumInfo {
  basePct: number;
  effectivePct: number;
  exception: { pct: number; justification: string; acta: string; appliedBy: string; appliedAt: string } | null;
}

interface AdminPanelProps {
  summary: {
    status: string;
    seats: number;
    candidatesCount: number;
    totalEligible: number;
    totalVotes: number;
    validBallots: number;
    annulledBallots: number;
    participationPct: number;
    minParticipationPercentage: number;
    minVotesRequired: number;
    requirementMet: boolean;
    candidacyHash: string;
  };
  quorum: QuorumInfo;
  role: string;
  candidates: ProcessCandidateSnapshot[];
  commission: Array<{ ci: string; name: string; office: string; brigadeCode: string }>;
  onRefresh: () => void;
}

export function AdminPanel({
  summary,
  quorum,
  role,
  candidates,
  commission,
  onRefresh,
}: AdminPanelProps) {
  // Estado local para importación del registro de electores
  const [csvInput, setCsvInput] = useState("");
  const [importReport, setImportReport] = useState<{ success: boolean; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Modal de biografía
  const [selectedBioCandidate, setSelectedBioCandidate] = useState<ProcessCandidateSnapshot | null>(null);

  // Estado local para configuración
  // Excepción de quórum (solo Administrador, 80-85 %, con acta)
  const [exceptionPct, setExceptionPct] = useState(String(quorum.effectivePct));
  const [exceptionJustification, setExceptionJustification] = useState("");
  const [exceptionActa, setExceptionActa] = useState("");
  const [quorumMsg, setQuorumMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const canAdjustQuorum = role === "ADMIN" && ["CONVOCADO", "ABIERTA", "CERRADA"].includes(summary.status);

  // Acciones sobre el proceso
  const [actionError, setActionError] = useState<string | null>(null);
  const handleProcessAction = async (action: "ABRIR" | "CERRAR") => {
    setActionError(null);
    try {
      const res = await fetch("/api/eleccion/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "No se pudo completar la acción.");
        return;
      }
      onRefresh();
    } catch {
      setActionError("No pudimos conectar con el servidor. Inténtalo de nuevo.");
    }
  };

  // Restablecer la activación de un elector (antes de abrir la votación)
  const [resetCi, setResetCi] = useState("");
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const handleResetAccount = async () => {
    setResetMsg(null);
    if (!/^\d{11}$/.test(resetCi.trim())) {
      setResetMsg({ ok: false, text: "El carnet de identidad tiene 11 dígitos." });
      return;
    }
    if (!window.confirm(`¿Restablecer la cuenta del carnet ${resetCi.trim()}? El elector tendrá que activarla de nuevo.`)) {
      return;
    }
    try {
      const res = await fetch("/api/cuenta/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ci: resetCi.trim() }),
      });
      const data = await res.json();
      setResetMsg({ ok: res.ok, text: res.ok ? data.message : data.error || "No se pudo restablecer la cuenta." });
      if (res.ok) setResetCi("");
    } catch {
      setResetMsg({ ok: false, text: "No pudimos conectar con el servidor. Inténtalo de nuevo." });
    }
  };

  const handleSaveQuorum = async () => {
    setQuorumMsg(null);
    const pct = Number(exceptionPct);
    if (!Number.isFinite(pct) || pct < 80 || pct > 85) {
      setQuorumMsg({ ok: false, text: "El quórum debe estar entre 80 % y 85 %." });
      return;
    }
    if (!window.confirm(`¿Fijar el quórum en más del ${pct} %? Quedará registrado en el acta y en la auditoría.`)) {
      return;
    }
    try {
      const res = await fetch("/api/eleccion/quorum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pct, justification: exceptionJustification, acta: exceptionActa }),
      });
      const data = await res.json();
      setQuorumMsg({ ok: res.ok, text: res.ok ? data.message : (data.issues?.[0] ?? data.error ?? "No se pudo guardar.") });
      if (res.ok) onRefresh();
    } catch {
      setQuorumMsg({ ok: false, text: "No pudimos conectar con el servidor. Inténtalo de nuevo." });
    }
  };

  // Importación incremental del registro de electores
  const handleImportPadron = async () => {
    if (!csvInput.trim()) {
      alert("Introduce líneas con el formato CSV del registro de electores.");
      return;
    }
    setIsImporting(true);
    setImportReport(null);

    try {
      const res = await fetch("/api/padron/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvInput,
          minParticipationPercentage: quorum.effectivePct,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportReport({
          success: true,
          message: `Importación completada: ${data.recordsToAdd.length} nuevos miembros agregados. ${data.alreadyExistingCount} omitidos por ya existir. Total de electores habilitados: ${data.totalEligibleAfter}. Votos requeridos: ${data.minVotesRequired}.`,
        });
        setCsvInput("");
        onRefresh();
      } else {
        setImportReport({
          success: false,
          message: `Error en importación: ${data.errors?.[0]?.message || "Verifica los datos."}`,
        });
      }
    } catch {
      setImportReport({
        success: false,
        message: "Error de conexión al importar el registro de electores.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Termómetro de Participación en Tiempo Real */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-feu-green-900">
              Estado de la Participación Electoral
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Monitoreo oficial de afluencia a las urnas en tiempo real
            </p>
          </div>
          <div className="flex gap-2">
            {(summary.status === "CONVOCADO" || summary.status === "LISTO") && (
              <button
                onClick={() => {
                  if (window.confirm("¿Abrir la votación? Los electores podrán votar desde este momento.")) {
                    handleProcessAction("ABRIR");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
              >
                <Play className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Abrir Votación</span>
              </button>
            )}
            {summary.status === "ABIERTA" && (
              <button
                onClick={() => {
                  if (window.confirm("¿Cerrar la votación? No se aceptarán más boletas y no se podrá reabrir.")) {
                    handleProcessAction("CERRAR");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-800"
              >
                <Square className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Cerrar Votación y Sellar Urnas</span>
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            {actionError}
          </p>
        )}

        {/* Tarjetas de Métricas */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-xs text-feu-green-700">Membresía Habilitada</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.totalEligible}</p>
            <p className="text-[11px] text-gray-500">Estudiantes activos</p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-xs text-feu-green-700">Boletas Depositadas</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.totalVotes}</p>
            <p className="text-[11px] text-gray-500">
              {summary.validBallots} válidas · {summary.annulledBallots} anuladas
            </p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-xs text-feu-green-700">Participación Actual</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.participationPct} %</p>
            <p className="text-[11px] text-gray-500">
              Meta requerida: &gt;{summary.minParticipationPercentage} %
            </p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-xs text-feu-green-700">Votos Mínimos Requeridos</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.minVotesRequired}</p>
            <p className="text-[11px] text-gray-500">
              {summary.requirementMet ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  Meta cumplida
                </span>
              ) : (
                `Faltan ${Math.max(0, summary.minVotesRequired - summary.totalVotes)}`
              )}
            </p>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-feu-green-900 mb-1">
            <span>Progreso hacia la Participación Requerida (&gt;{summary.minParticipationPercentage} %)</span>
            <span>{summary.totalVotes} de {summary.minVotesRequired} votos necesarios</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-500 ${
                summary.requirementMet ? "bg-emerald-600" : "bg-amber-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  summary.minVotesRequired > 0 ? (summary.totalVotes / summary.minVotesRequired) * 100 : 0,
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" strokeWidth={2} />
            <span>
              <strong>Principio de Urna Sellada:</strong> Durante el proceso abierto, los votos individuales por candidato permanecen cifrados y desacoplados. Nadie puede ver los resultados parciales hasta el cierre.
            </span>
          </p>
        </div>
      </div>

      {/* Gestión Incremental de la Membresía y Configuración */}
      {/* Restablecer activación de cuentas (antes de abrir la votación) */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-feu-green-900">Restablecer la cuenta de un elector</h3>
        <p className="text-xs text-gray-600 mt-1">
          Úsalo si un elector informa que otra persona activó su cuenta. Solo es posible antes de abrir la votación.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <label htmlFor="reset-ci" className="sr-only">
            Carnet de identidad del elector
          </label>
          <input
            id="reset-ci"
            inputMode="numeric"
            maxLength={11}
            value={resetCi}
            onChange={(e) => setResetCi(e.target.value.replace(/\D/g, ""))}
            placeholder="Carnet de identidad (11 dígitos)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={handleResetAccount}
            className="min-h-11 rounded-lg bg-[#136D54] px-4 py-2 text-sm font-bold text-white hover:bg-[#0C4B39]"
          >
            Restablecer cuenta
          </button>
        </div>
        {resetMsg && (
          <p
            role={resetMsg.ok ? "status" : "alert"}
            className={`mt-2 text-sm font-medium ${resetMsg.ok ? "text-emerald-800" : "text-red-800"}`}
          >
            {resetMsg.text}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Registro de Electores Incremental */}
        <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-feu-green-900">
            Registro de Electores (Carga Incremental)
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Puedes pegar filas del listado de electores (CI, Nombre, 1er. Apellido, 2do. Apellido, Brigada). Los Carnets repetidos serán omitidos automáticamente sin duplicarse.
          </p>

          <textarea
            rows={4}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={`03080468489,Adán,Adán,Cabrera,41\n02052981315,Roxana,Almaguer,Sosa,41`}
            className="mt-3 w-full rounded-lg border border-gray-300 p-2.5 font-mono text-xs text-gray-900 focus:border-feu-green-700 focus:outline-hidden"
          />

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => {
                setCsvInput(
                  "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada\n04051283921,Marcos,Valdés,Pérez,11\n03091482910,Laura,Díaz,Méndez,22",
                );
              }}
              className="text-xs text-feu-green-700 underline hover:text-feu-green-900"
            >
              Cargar plantilla de ejemplo
            </button>
            <button
              onClick={handleImportPadron}
              disabled={isImporting}
              className="rounded-lg bg-feu-green-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-feu-green-800 disabled:opacity-50"
            >
              {isImporting ? "Procesando..." : "Importar / Merge por CI"}
            </button>
          </div>

          {importReport && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                importReport.success
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {importReport.success ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" strokeWidth={2} />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" strokeWidth={2} />
              )}
              <span>{importReport.message}</span>
            </div>
          )}
        </div>

        {/* Quórum (Art. 38): 85 % por defecto; excepción solo del Administrador */}
        <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-feu-green-900">Quórum de la elección</h3>
          <p className="text-sm text-gray-700 mt-1">
            La elección es válida con <strong>más del {quorum.effectivePct} %</strong> de participación.
          </p>
          {quorum.exception ? (
            <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-950">
              Excepción aprobada (acta {quorum.exception.acta}): {quorum.exception.justification}. La regla general del
              Art. 38 para Facultad es más del {quorum.basePct} %.
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-600">Regla general del Art. 38 para Facultad.</p>
          )}
          <p className="mt-2 text-xs text-gray-600">
            Puestos a elegir: {summary.seats} (candidatos − 2, Art. 59). No se modifica.
          </p>

          {canAdjustQuorum && (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-600">
                Solo si se aprobó una excepción. Se puede aplicar hasta antes del escrutinio, entre 80 % y 85 %. 85 %
                restablece la regla general.
              </p>
              <label htmlFor="quorum-pct" className="text-xs font-semibold text-gray-700 block">
                Quórum (%)
              </label>
              <input
                id="quorum-pct"
                type="number"
                min={80}
                max={85}
                step={0.5}
                value={exceptionPct}
                onChange={(e) => setExceptionPct(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
              />
              <label htmlFor="quorum-justification" className="text-xs font-semibold text-gray-700 block">
                Motivo
              </label>
              <textarea
                id="quorum-justification"
                rows={2}
                value={exceptionJustification}
                onChange={(e) => setExceptionJustification(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
              />
              <label htmlFor="quorum-acta" className="text-xs font-semibold text-gray-700 block">
                Acta o resolución que lo aprueba
              </label>
              <input
                id="quorum-acta"
                value={exceptionActa}
                onChange={(e) => setExceptionActa(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
              />
              <button
                type="button"
                onClick={handleSaveQuorum}
                className="min-h-11 w-full rounded-lg bg-[#136D54] px-4 py-2 text-sm font-bold text-white hover:bg-[#0C4B39]"
              >
                Aplicar quórum
              </button>
              {quorumMsg && (
                <p
                  role={quorumMsg.ok ? "status" : "alert"}
                  className={`text-sm font-medium ${quorumMsg.ok ? "text-emerald-800" : "text-red-800"}`}
                >
                  {quorumMsg.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Candidaturas Oficiales Congeladas */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-feu-green-900">
              Candidaturas Oficiales
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {summary.seats} puestos en disputa de {summary.candidatesCount} candidaturas (Art. 59) · Orden alfabético
            </p>
          </div>
        </div>

        <div className="mt-3 divide-y divide-gray-100 text-sm">
          {candidates.map((c) => (
            <div key={c.candidateId} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-feu-green-100 text-xs font-bold text-feu-green-800">
                  {c.ballotPosition}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{c.fullName}</p>
                  <p className="text-xs text-gray-500">
                    CI: {c.ci} · Brigada: {c.brigadeCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBioCandidate(c)}
                className="text-xs text-feu-green-700 underline hover:text-feu-green-900"
              >
                Ver Biografía
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Comisión Electoral Constituida */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-feu-green-900">
          Comisión Electoral Constituida (Art. 47)
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Autoridades electorales de la Facultad
        </p>
        <div className="mt-3 divide-y divide-gray-100">
          {commission.map((member) => (
            <div key={member.ci} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-semibold text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">
                  CI: {member.ci} · Brigada: {member.brigadeCode}
                </p>
              </div>
              <span className="rounded-full bg-feu-green-100 px-3 py-1 text-xs font-bold text-feu-green-800 uppercase">
                {member.office === "PRESIDENT"
                  ? "PRESIDENCIA"
                  : member.office === "VICE_PRESIDENT"
                  ? "REVISOR / 2DO MIEMBRO"
                  : member.office === "SECRETARY"
                  ? "SECRETARÍA"
                  : "MIEMBRO / REVISOR"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Biografía */}
      <BiographyModal
        candidate={selectedBioCandidate}
        onClose={() => setSelectedBioCandidate(null)}
      />
    </div>
  );
}
