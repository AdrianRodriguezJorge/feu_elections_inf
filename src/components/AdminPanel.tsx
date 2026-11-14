"use client";

import { useState } from "react";
import { Play, Square, Check, AlertTriangle, Lock } from "lucide-react";
import { ProcessCandidateSnapshot } from "@/domain/candidates";
import { BiographyModal } from "./BiographyModal";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { formatPct, officeLabel } from "@/lib/status-labels";

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

const fieldCls =
  "w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-cujae-green-500 focus:ring-2 focus:ring-cujae-green-500/20 focus:outline-hidden";

export function AdminPanel({ summary, quorum, role, candidates, commission, onRefresh }: AdminPanelProps) {
  const confirm = useConfirm();
  const [csvInput, setCsvInput] = useState("");
  const [importReport, setImportReport] = useState<{ success: boolean; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedBioCandidate, setSelectedBioCandidate] = useState<ProcessCandidateSnapshot | null>(null);

  const [exceptionPct, setExceptionPct] = useState(String(quorum.effectivePct));
  const [exceptionJustification, setExceptionJustification] = useState("");
  const [exceptionActa, setExceptionActa] = useState("");
  const [quorumMsg, setQuorumMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const canAdjustQuorum = role === "ADMIN" && ["CONVOCADO", "ABIERTA", "CERRADA"].includes(summary.status);

  const [actionError, setActionError] = useState<string | null>(null);
  const handleProcessAction = async (action: "ABRIR" | "CERRAR") => {
    setActionError(null);
    const ok = await confirm(
      action === "ABRIR"
        ? {
            title: "¿Abrir la votación?",
            description: "Los electores podrán votar desde este momento.",
            confirmLabel: "Abrir votación",
          }
        : {
            title: "¿Cerrar la votación?",
            description: "No se aceptarán más votos y la votación no se podrá reabrir.",
            confirmLabel: "Cerrar votación",
            danger: true,
          },
    );
    if (!ok) return;
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
      setActionError("No se pudo conectar con el servidor. Inténtelo de nuevo.");
    }
  };

  const [resetCi, setResetCi] = useState("");
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const handleResetAccount = async () => {
    setResetMsg(null);
    if (!/^\d{11}$/.test(resetCi.trim())) {
      setResetMsg({ ok: false, text: "El carné de identidad debe tener 11 dígitos." });
      return;
    }
    const ok = await confirm({
      title: "¿Restablecer la cuenta?",
      description: `La cuenta del carné ${resetCi.trim()} quedará sin activar y el elector tendrá que activarla de nuevo.`,
      confirmLabel: "Restablecer cuenta",
      danger: true,
    });
    if (!ok) return;
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
      setResetMsg({ ok: false, text: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    }
  };

  const handleSaveQuorum = async () => {
    setQuorumMsg(null);
    const pct = Number(exceptionPct);
    if (!Number.isFinite(pct) || pct < 80 || pct > 85) {
      setQuorumMsg({ ok: false, text: "El quórum debe estar entre el 80 % y el 85 %." });
      return;
    }
    const ok = await confirm({
      title: "¿Aplicar el nuevo quórum?",
      description: `La elección será válida con más del ${formatPct(pct)} de participación. El cambio queda registrado.`,
      confirmLabel: "Aplicar quórum",
    });
    if (!ok) return;
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
      setQuorumMsg({ ok: false, text: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    }
  };

  const handleImportPadron = async () => {
    setImportReport(null);
    if (!csvInput.trim()) {
      setImportReport({ success: false, message: "Pegue al menos una fila del listado de electores." });
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch("/api/padron/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvInput, minParticipationPercentage: quorum.effectivePct }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportReport({
          success: true,
          message: `Importación completada: ${data.recordsToAdd.length} electores nuevos y ${data.alreadyExistingCount} omitidos porque ya estaban registrados. Total de electores habilitados: ${data.totalEligibleAfter}. Votos necesarios para el quórum: ${data.minVotesRequired}.`,
        });
        setCsvInput("");
        onRefresh();
      } else {
        setImportReport({
          success: false,
          message: `No se pudo importar: ${data.errors?.[0]?.message || data.error || "revise los datos."}`,
        });
      }
    } catch {
      setImportReport({ success: false, message: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    } finally {
      setIsImporting(false);
    }
  };

  const missingVotes = Math.max(0, summary.minVotesRequired - summary.totalVotes);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-feu-green-900">Participación en la elección</h2>
            <p className="mt-0.5 text-sm text-gray-700">Datos actualizados de la votación</p>
          </div>
          <div className="flex gap-2">
            {summary.status === "CONVOCADO" && (
              <Button onClick={() => handleProcessAction("ABRIR")}>
                <Play className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span>Abrir votación</span>
              </Button>
            )}
            {summary.status === "ABIERTA" && (
              <Button variant="danger" onClick={() => handleProcessAction("CERRAR")}>
                <Square className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span>Cerrar votación</span>
              </Button>
            )}
          </div>
        </div>

        {actionError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            {actionError}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-sm text-feu-green-800">Electores habilitados</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.totalEligible}</p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-sm text-feu-green-800">Votos emitidos</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.totalVotes}</p>
            <p className="text-xs text-gray-700">
              {summary.validBallots} válidos · {summary.annulledBallots} anulados
            </p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-sm text-feu-green-800">Participación</p>
            <p className="text-2xl font-bold text-feu-green-900">{formatPct(summary.participationPct)}</p>
            <p className="text-xs text-gray-700">Se requiere más del {formatPct(summary.minParticipationPercentage)}</p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-sm text-feu-green-800">Votos necesarios</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.minVotesRequired}</p>
            <p className="text-xs text-gray-700">
              {summary.requirementMet ? (
                <span className="inline-flex items-center gap-1 font-semibold text-cujae-green-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Quórum alcanzado
                </span>
              ) : (
                `Faltan ${missingVotes} ${missingVotes === 1 ? "voto" : "votos"}`
              )}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex flex-wrap justify-between gap-1 text-sm font-semibold text-feu-green-900">
            <span id="quorum-progress-label">Avance hacia el quórum (más del {formatPct(summary.minParticipationPercentage)})</span>
            <span>
              {summary.totalVotes} de {summary.minVotesRequired} votos necesarios
            </span>
          </div>
          <div
            className="h-4 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-labelledby="quorum-progress-label"
            aria-valuemin={0}
            aria-valuemax={summary.minVotesRequired}
            aria-valuenow={Math.min(summary.totalVotes, summary.minVotesRequired)}
          >
            <div
              className={`h-full transition-all duration-500 ${summary.requirementMet ? "bg-cujae-green-500" : "bg-amber-500"}`}
              style={{
                width: `${Math.min(100, summary.minVotesRequired > 0 ? (summary.totalVotes / summary.minVotesRequired) * 100 : 0)}%`,
              }}
            />
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-gray-700">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" strokeWidth={2} aria-hidden="true" />
            <span>Mientras la votación esté abierta nadie puede ver resultados parciales, y los votos no se asocian a ningún elector.</span>
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-feu-green-900">Restablecer la cuenta de un elector</h3>
        <p className="mt-1 text-sm text-gray-700">
          Utilícelo si un elector informa de que otra persona activó su cuenta. Solo es posible antes de abrir la votación.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="reset-ci" className="mb-1 block text-sm font-semibold text-gray-800">
              Carné de identidad del elector
            </label>
            <input
              id="reset-ci"
              inputMode="numeric"
              maxLength={11}
              value={resetCi}
              onChange={(e) => setResetCi(e.target.value.replace(/\D/g, ""))}
              placeholder="11 dígitos"
              className={`${fieldCls} font-mono`}
            />
          </div>
          <Button onClick={handleResetAccount}>Restablecer cuenta</Button>
        </div>
        {resetMsg && (
          <p role={resetMsg.ok ? "status" : "alert"} className={`mt-2 text-sm font-medium ${resetMsg.ok ? "text-cujae-green-700" : "text-red-800"}`}>
            {resetMsg.text}
          </p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-feu-green-900">Registro de electores</h3>
          <p className="mt-1 text-sm text-gray-700">
            Pegue filas del listado con el formato: carné de identidad, nombre, primer apellido, segundo apellido, brigada. Los
            carnés que ya estén registrados se omiten.
          </p>
          <label htmlFor="padron-csv" className="mt-3 block text-sm font-semibold text-gray-800">
            Filas del listado de electores
          </label>
          <textarea
            id="padron-csv"
            rows={4}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={`03080468489,Adán,Adán,Cabrera,41\n02052981315,Roxana,Almaguer,Sosa,41`}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 font-mono text-sm text-gray-900 focus:border-cujae-green-500 focus:outline-hidden"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              className="underline"
              onClick={() =>
                setCsvInput(
                  "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada\n04051283921,Marcos,Valdés,Pérez,11\n03091482910,Laura,Díaz,Méndez,22",
                )
              }
            >
              Cargar ejemplo
            </Button>
            <Button onClick={handleImportPadron} disabled={isImporting}>
              {isImporting ? "Importando…" : "Importar electores (se omiten carnés repetidos)"}
            </Button>
          </div>
          {importReport && (
            <div
              role={importReport.success ? "status" : "alert"}
              className={`mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-sm ${
                importReport.success ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {importReport.success ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2} aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" strokeWidth={2} aria-hidden="true" />
              )}
              <span>{importReport.message}</span>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-feu-green-900">Quórum de la elección</h3>
          <p className="mt-1 text-sm text-gray-700">
            La elección es válida con <strong>más del {formatPct(quorum.effectivePct)}</strong> de participación.
          </p>
          {quorum.exception ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-950">
              Excepción aprobada (acta {quorum.exception.acta}): {quorum.exception.justification}. La regla general del Art. 38
              para la Facultad es más del {formatPct(quorum.basePct)}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-700">Regla general del Art. 38 para la Facultad.</p>
          )}
          <p className="mt-2 text-sm text-gray-700">
            Puestos a elegir: {summary.seats} (número de candidatos menos 2, Art. 59).
          </p>

          {canAdjustQuorum && (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
              <p className="text-sm text-gray-700">
                Solo si se aprobó una excepción. Puede aplicarse hasta antes del escrutinio, entre el 80 % y el 85 %. El 85 %
                restablece la regla general.
              </p>
              <label htmlFor="quorum-pct" className="block text-sm font-semibold text-gray-800">
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
                className={fieldCls}
              />
              <label htmlFor="quorum-justification" className="block text-sm font-semibold text-gray-800">
                Motivo
              </label>
              <textarea
                id="quorum-justification"
                rows={2}
                value={exceptionJustification}
                onChange={(e) => setExceptionJustification(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
              />
              <label htmlFor="quorum-acta" className="block text-sm font-semibold text-gray-800">
                Acta o resolución que lo aprueba
              </label>
              <input id="quorum-acta" value={exceptionActa} onChange={(e) => setExceptionActa(e.target.value)} className={fieldCls} />
              <Button className="w-full" onClick={handleSaveQuorum}>
                Aplicar quórum
              </Button>
              {quorumMsg && (
                <p role={quorumMsg.ok ? "status" : "alert"} className={`text-sm font-medium ${quorumMsg.ok ? "text-cujae-green-700" : "text-red-800"}`}>
                  {quorumMsg.text}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-lg font-bold text-feu-green-900">Candidaturas</h3>
          <p className="mt-0.5 text-sm text-gray-700">
            {summary.seats} puestos para {summary.candidatesCount} candidaturas (Art. 59) · Orden alfabético
          </p>
        </div>
        {candidates.length === 0 ? (
          <p className="mt-3 text-sm text-gray-700">Todavía no hay candidaturas registradas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {candidates.map((c) => (
              <li key={c.candidateId} className="flex items-center justify-between gap-2 py-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-feu-green-100 text-xs font-bold text-feu-green-800">
                    {c.ballotPosition}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{c.fullName}</p>
                    <p className="text-xs text-gray-700">
                      Carné: {c.ci} · Brigada {c.brigadeCode}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" className="underline" onClick={() => setSelectedBioCandidate(c)}>
                  Ver biografía<span className="sr-only"> de {c.fullName}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-feu-green-900">Comisión Electoral (Art. 47)</h3>
        <p className="mt-0.5 text-sm text-gray-700">Autoridades electorales de la Facultad</p>
        {commission.length === 0 ? (
          <p className="mt-3 text-sm text-gray-700">La Comisión Electoral aún no está registrada.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {commission.map((member, i) => (
              <li key={`${member.office}-${member.name}-${i}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-700">Brigada {member.brigadeCode}</p>
                </div>
                <span className="rounded-full bg-feu-green-100 px-3 py-1 text-xs font-bold text-feu-green-900">
                  {officeLabel(member.office)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BiographyModal candidate={selectedBioCandidate} onClose={() => setSelectedBioCandidate(null)} />
    </div>
  );
}
