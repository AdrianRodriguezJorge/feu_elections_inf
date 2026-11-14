"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Lock, Archive, Zap, AlertTriangle, Star, Download, FileText, Check, X, Scale, Printer } from "lucide-react";
import type { SecretariatComposition, VacancyEvent, VacancyReason } from "@/domain/vacancies";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  VACANCY_REASON_LABELS,
  formatDate,
  formatDateTime,
  formatPct,
  officeLabel,
  statusLabel,
} from "@/lib/status-labels";

interface EnrichedTotal {
  candidateId: string;
  fullName: string;
  brigadeCode: string;
  memberVotes: number;
  presidentVotes: number;
  isElected: boolean;
  isPresident: boolean;
}

interface CommissionMember {
  name: string;
  office: string;
}

interface ResultsPanelProps {
  status: string;
  role: string;
  totalVotes: number;
  totalEligible: number;
  minParticipationPercentage: number;
  onRefresh: () => void;
}

const OFFICE_ORDER: Record<string, number> = { PRESIDENT: 0, VICE_PRESIDENT: 1, SECRETARY: 2, MEMBER: 3 };

const ROLE_LABELS: Record<string, string> = {
  PRESIDENTE: "la Presidencia",
  VICEPRESIDENTE: "la Vicepresidencia",
  MIEMBRO: "un puesto del Secretariado",
};

/** Describe un evento del historial del Secretariado en lenguaje claro. */
function describeEvent(ev: VacancyEvent): string {
  const role = ROLE_LABELS[ev.vacatedRole] ?? "un cargo";
  if (ev.outgoingCandidateId && ev.outgoingFullName && ev.vacatedRole !== "VICEPRESIDENTE") {
    const reason = VACANCY_REASON_LABELS[ev.reason] ?? "otro motivo";
    const successor = ev.successorFullName ? ` Asumió el cargo ${ev.successorFullName}.` : " El cargo quedó pendiente de cubrir.";
    return `${ev.outgoingFullName} dejó ${role} por ${reason}.${successor}`;
  }
  if (ev.successorFullName) return `Se designó a ${ev.successorFullName} para ${role}.`;
  return `Se registró un cambio en ${role}.`;
}

const inputCls = "w-full min-h-11 rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900";

export function ResultsPanel({
  status,
  role,
  totalVotes,
  totalEligible,
  minParticipationPercentage,
  onRefresh,
}: ResultsPanelProps) {
  const confirm = useConfirm();
  const [isTallying, setIsTallying] = useState(false);
  const [tallyData, setTallyData] = useState<{
    quorum: { participations: number; participationPct: number; quorumMet: boolean };
    tally: {
      totals: EnrichedTotal[];
      elected: string[];
      presidentId: string | null;
      president?: { name: string; fullName: string; brigadeCode: string } | null;
      tie: { type: "CUT" | "PRESIDENT"; candidateIds: string[] } | null;
    };
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commission, setCommission] = useState<CommissionMember[]>([]);

  const [selectedVpId, setSelectedVpId] = useState<string>("");
  const [vpDesignationMsg, setVpDesignationMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [composition, setComposition] = useState<SecretariatComposition | null>(null);

  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [vacancyReason, setVacancyReason] = useState<VacancyReason>("DIMISION_VOLUNTARIA");
  const [vacancyJustification, setVacancyJustification] = useState("");
  const [successorCandidateId, setSuccessorCandidateId] = useState("");
  const [isProcessingVacancy, setIsProcessingVacancy] = useState(false);
  const [vacancyMsg, setVacancyMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [councilAttendance, setCouncilAttendance] = useState("");
  const [councilInFavor, setCouncilInFavor] = useState("");

  const [newVpSuccessorId, setNewVpSuccessorId] = useState("");
  const [isDesignatingNewVp, setIsDesignatingNewVp] = useState(false);

  const isAuthority = role === "ADMIN" || role === "COMMISSION";
  // Sin quórum o con empate pendiente no hay proclamación.
  const canProclaim = status !== "SIN_QUORUM" && status !== "EMPATE";

  const [tieResolution, setTieResolution] = useState<{ justification: string; acta: string } | null>(null);
  const [tieChosen, setTieChosen] = useState<string[]>([]);
  const [tiePresident, setTiePresident] = useState("");
  const [tieJustification, setTieJustification] = useState("");
  const [tieActa, setTieActa] = useState("");
  const [tieMsg, setTieMsg] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    try {
      const res = await fetch("/api/eleccion/estado");
      const data = await res.json();
      if (!res.ok) return;
      setComposition(data.composition ?? null);
      if (data.designatedVpId) setSelectedVpId(data.designatedVpId);
      setTieResolution(data.tieResolution ?? null);
      setCommission(
        [...((data.commission ?? []) as CommissionMember[])].sort(
          (a, b) => (OFFICE_ORDER[a.office] ?? 9) - (OFFICE_ORDER[b.office] ?? 9),
        ),
      );

      const t = data.tallyResult;
      const q = data.tallyQuorum;
      if (!t || !q) {
        setTallyData(null);
        return;
      }
      const proclaimed = !["SIN_QUORUM", "EMPATE"].includes(data.summary?.status);
      const presidentId: string | null = t.resolution?.presidentId ?? t.presidentId;
      const byId = new Map<string, { fullName: string; name: string; brigadeCode: string }>(
        (data.candidates ?? []).map((c: { candidateId: string; fullName: string; name: string; brigadeCode: string }) => [
          c.candidateId,
          c,
        ]),
      );
      const totals: EnrichedTotal[] = t.totals.map(
        (x: { candidateId: string; memberVotes: number; presidentVotes: number }) => ({
          ...x,
          fullName: byId.get(x.candidateId)?.fullName ?? x.candidateId,
          brigadeCode: byId.get(x.candidateId)?.brigadeCode ?? "",
          isElected: proclaimed && t.elected.includes(x.candidateId),
          isPresident: proclaimed && presidentId === x.candidateId,
        }),
      );
      const president = proclaimed && presidentId ? (byId.get(presidentId) ?? null) : null;
      setTallyData({ quorum: q, tally: { ...t, presidentId, totals, president } });
    } catch {
      // Se reintenta al volver a la pestaña
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [status, loadResults]);

  const handleResolveTie = async () => {
    setTieMsg(null);
    const ok = await confirm({
      title: "¿Registrar la decisión de la Comisión?",
      description: "Se registrará la decisión sobre el empate y se proclamarán los resultados. Esta acción no se puede deshacer.",
      confirmLabel: "Registrar decisión y proclamar",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/escrutinio/empate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(tieChosen.length ? { electedIds: tieChosen } : {}),
          ...(tiePresident ? { presidentId: tiePresident } : {}),
          justification: tieJustification,
          acta: tieActa,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTieMsg(data.issues?.[0] ?? data.error ?? "No se pudo resolver el empate.");
        return;
      }
      await loadResults();
      onRefresh();
    } catch {
      setTieMsg("No se pudo conectar con el servidor. Inténtelo de nuevo.");
    }
  };

  const handleRunTally = async () => {
    const ok = await confirm({
      title: "¿Realizar el escrutinio?",
      description: "El escrutinio se realiza una sola vez y fija el resultado oficial de la elección.",
      confirmLabel: "Realizar escrutinio",
    });
    if (!ok) return;
    setIsTallying(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/escrutinio", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await loadResults();
        onRefresh();
      } else {
        setErrorMsg(data.error || "No se pudo realizar el escrutinio.");
      }
    } catch {
      setErrorMsg("No se pudo conectar con el servidor. Inténtelo de nuevo.");
    } finally {
      setIsTallying(false);
    }
  };

  const handleDesignateVp = async () => {
    setVpDesignationMsg(null);
    if (!selectedVpId) {
      setVpDesignationMsg({ success: false, message: "Seleccione un miembro electo para la Vicepresidencia." });
      return;
    }
    const name = tallyData?.tally.totals.find((t) => t.candidateId === selectedVpId)?.fullName ?? "";
    const ok = await confirm({
      title: "¿Designar vicepresidente?",
      description: `Se designará a ${name} como Vicepresidente del Secretariado.`,
      confirmLabel: "Designar vicepresidente",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/comision/designar-vp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: selectedVpId }),
      });
      const data = await res.json();
      if (res.ok) {
        setVpDesignationMsg({ success: true, message: data.message });
        if (data.composition) setComposition(data.composition);
        onRefresh();
      } else {
        setVpDesignationMsg({ success: false, message: data.error || "No se pudo designar al vicepresidente." });
      }
    } catch {
      setVpDesignationMsg({ success: false, message: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    }
  };

  const handleProcessPresidentialVacancy = async () => {
    if (!vacancyJustification.trim()) {
      setVacancyMsg({ success: false, message: "Escriba el motivo de la vacante." });
      return;
    }
    if (vacancyReason === "SEPARACION_DISCIPLINARIA" && (!councilAttendance || !councilInFavor)) {
      setVacancyMsg({
        success: false,
        message: "La separación disciplinaria exige indicar la asistencia y los votos a favor del Consejo según el acta.",
      });
      return;
    }
    const ok = await confirm({
      title: "¿Registrar la vacante de la Presidencia?",
      description: "Se registrará la vacante y la sucesión en la Presidencia. Esta acción no se puede deshacer.",
      confirmLabel: "Registrar vacante",
      danger: true,
    });
    if (!ok) return;
    setIsProcessingVacancy(true);
    setVacancyMsg(null);
    try {
      const res = await fetch("/api/comision/vacante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "VACANCIA_PRESIDENTE",
          reason: vacancyReason,
          justification: vacancyJustification,
          successorCandidateId: successorCandidateId || undefined,
          councilAttendancePct: councilAttendance ? Number(councilAttendance) : undefined,
          councilVotesInFavorPct: councilInFavor ? Number(councilInFavor) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComposition(data.composition);
        setVacancyMsg({ success: true, message: data.message });
        setShowVacancyForm(false);
        setVacancyJustification("");
        onRefresh();
      } else {
        setVacancyMsg({ success: false, message: data.error });
      }
    } catch {
      setVacancyMsg({ success: false, message: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    } finally {
      setIsProcessingVacancy(false);
    }
  };

  const handleDesignateSuccessorVp = async () => {
    setVacancyMsg(null);
    if (!newVpSuccessorId) {
      setVacancyMsg({ success: false, message: "Seleccione un miembro del Secretariado para la Vicepresidencia." });
      return;
    }
    const name = composition?.members.find((m) => m.candidateId === newVpSuccessorId)?.fullName ?? "";
    const ok = await confirm({
      title: "¿Designar vicepresidente?",
      description: `Se designará a ${name} como nuevo Vicepresidente del Secretariado.`,
      confirmLabel: "Designar vicepresidente",
    });
    if (!ok) return;
    setIsDesignatingNewVp(true);
    try {
      const res = await fetch("/api/comision/vacante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DESIGNAR_NUEVO_VP",
          successorCandidateId: newVpSuccessorId,
          justification: "Designación de nueva Vicepresidencia (Art. 67)",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComposition(data.composition);
        setVacancyMsg({ success: true, message: data.message });
        setNewVpSuccessorId("");
        onRefresh();
      } else {
        setVacancyMsg({ success: false, message: data.error });
      }
    } catch {
      setVacancyMsg({ success: false, message: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    } finally {
      setIsDesignatingNewVp(false);
    }
  };

  const handleExportCsv = () => {
    if (!tallyData) return;
    const headers = "Candidato,Brigada,Votos para miembro,Votos para presidente,Condición\n";
    const rows = tallyData.tally.totals
      .map((t) => {
        const condicion = t.isPresident ? "Presidente electo" : t.isElected ? "Electo" : "No electo";
        return `"${t.fullName}","${t.brigadeCode}",${t.memberVotes},${t.presidentVotes},"${condicion}"`;
      })
      .join("\n");
    const blob = new Blob(["﻿" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resultados-feu-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (status === "ABIERTA") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-feu-green-300 bg-white p-10 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-10 w-10 text-amber-700" strokeWidth={2} aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-feu-green-900">Resultados no disponibles durante la votación</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          Para proteger el secreto del voto, no se muestran resultados parciales mientras la votación esté abierta.
        </p>
        <ul className="mt-6 space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left text-sm text-gray-800">
          <li><strong>Estado:</strong> {statusLabel(status)}</li>
          <li><strong>Votos emitidos:</strong> {totalVotes}</li>
          <li><strong>Electores habilitados:</strong> {totalEligible}</li>
          <li><strong>Participación mínima:</strong> más del {formatPct(minParticipationPercentage)} (Art. 38)</li>
        </ul>
        <p className="mt-4 text-sm text-gray-600">
          Los resultados estarán disponibles cuando la Comisión Electoral cierre la votación y realice el escrutinio.
        </p>
      </div>
    );
  }

  if (!tallyData && !(isAuthority && status === "CERRADA")) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-feu-green-300 bg-white p-10 text-center shadow-md">
        <h2 className="text-2xl font-bold text-feu-green-900">Resultados aún no disponibles</h2>
        <p className="mt-2 text-sm text-gray-700">
          Los resultados se publican cuando la Comisión Electoral cierra la votación y realiza el escrutinio.
        </p>
      </div>
    );
  }

  if (!tallyData) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-feu-green-300 bg-white p-10 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
          <Archive className="h-10 w-10 text-blue-700" strokeWidth={2} aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-feu-green-900">Escrutinio de la elección</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          La votación ha concluido. Realice el escrutinio para contar los votos válidos y comprobar si se alcanzó el
          quórum.
        </p>
        {errorMsg && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {errorMsg}
          </div>
        )}
        <div className="mt-6">
          <Button onClick={handleRunTally} disabled={isTallying} className="px-8 py-3 text-base">
            <Zap className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            <span>{isTallying ? "Realizando escrutinio…" : "Realizar escrutinio"}</span>
          </Button>
        </div>
      </div>
    );
  }

  const { quorum, tally } = tallyData;
  const eligibleForVp = tally.totals.filter((t) => t.isElected && !t.isPresident);
  const presidentChanged = !!(composition && tally.president && composition.president.candidateId !== tally.presidentId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div
        className={`rounded-xl border p-6 shadow-sm ${
          quorum.quorumMet ? "border-emerald-300 bg-emerald-50/60 text-emerald-950" : "border-red-300 bg-red-50/60 text-red-950"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                quorum.quorumMet ? "border-emerald-300 bg-emerald-200 text-emerald-900" : "border-red-300 bg-red-200 text-red-900"
              }`}
            >
              {quorum.quorumMet ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              )}
              <span>{quorum.quorumMet ? "Quórum alcanzado" : "Quórum no alcanzado"}</span>
            </span>
            <h2 className="mt-2 text-xl font-bold">
              {quorum.quorumMet ? "La elección es válida (Art. 38)" : "La elección no es válida por falta de quórum (Art. 38)"}
            </h2>
            <p className="mt-1 text-sm">
              Participó el <strong>{formatPct(quorum.participationPct)}</strong> ({quorum.participations} de {totalEligible}{" "}
              electores). Se requería más del {formatPct(minParticipationPercentage)}.
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-700">Participación</span>
            <p className="text-3xl font-extrabold">{formatPct(quorum.participationPct)}</p>
          </div>
        </div>
      </div>

      {status === "EMPATE" && tally.tie && (
        <div className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-6 text-red-950 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-7 w-7 shrink-0 text-red-700" strokeWidth={2} aria-hidden="true" />
            <div>
              <h3 className="text-lg font-bold">
                {tally.tie.type === "PRESIDENT" ? "Empate en la Presidencia" : "Empate en el último puesto del Secretariado"}
              </h3>
              <p className="mt-1 text-sm">
                Los votos para presidente no resolvieron el empate. La Comisión Electoral decide entre los candidatos
                empatados y deja constancia en acta. Los resultados no se proclaman hasta entonces.
              </p>
              <p className="mt-1 text-sm">
                Candidatos empatados:{" "}
                <strong>
                  {tally.tie.candidateIds.map((id) => tally.totals.find((t) => t.candidateId === id)?.fullName ?? id).join(", ")}
                </strong>
              </p>
            </div>
          </div>

          {isAuthority && (
            <div className="space-y-3 rounded-lg border border-red-200 bg-white p-4 text-gray-900">
              {tally.tie.type === "CUT" && (
                <fieldset>
                  <legend className="text-sm font-semibold">Candidatos que ocupan los puestos restantes</legend>
                  <div className="mt-2 space-y-1">
                    {tally.tie.candidateIds.map((id) => (
                      <label key={id} className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={tieChosen.includes(id)}
                          onChange={(e) => setTieChosen(e.target.checked ? [...tieChosen, id] : tieChosen.filter((x) => x !== id))}
                          className="h-5 w-5"
                        />
                        {tally.totals.find((t) => t.candidateId === id)?.fullName ?? id}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div>
                <label htmlFor="tie-president" className="mb-1 block text-sm font-semibold">
                  Presidente{tally.tie.type === "CUT" ? " (solo si vuelve a haber empate en la Presidencia)" : ""}
                </label>
                <select id="tie-president" value={tiePresident} onChange={(e) => setTiePresident(e.target.value)} className={inputCls}>
                  <option value="">Seleccione un candidato</option>
                  {(tally.tie.type === "PRESIDENT" ? tally.tie.candidateIds : tally.totals.map((t) => t.candidateId)).map((id) => (
                    <option key={id} value={id}>
                      {tally.totals.find((t) => t.candidateId === id)?.fullName ?? id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tie-justification" className="mb-1 block text-sm font-semibold">
                  Motivo de la decisión
                </label>
                <textarea
                  id="tie-justification"
                  rows={2}
                  value={tieJustification}
                  onChange={(e) => setTieJustification(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="tie-acta" className="mb-1 block text-sm font-semibold">
                  Acta de la Comisión
                </label>
                <input
                  id="tie-acta"
                  value={tieActa}
                  onChange={(e) => setTieActa(e.target.value)}
                  placeholder="Número o referencia del acta"
                  className={inputCls}
                />
              </div>
              {tieMsg && (
                <p role="alert" className="text-sm font-medium text-red-800">
                  {tieMsg}
                </p>
              )}
              <Button variant="danger" onClick={handleResolveTie}>
                Registrar decisión y proclamar
              </Button>
            </div>
          )}
        </div>
      )}

      {tieResolution && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          El empate fue resuelto por la Comisión Electoral (acta {tieResolution.acta}): {tieResolution.justification}
        </div>
      )}

      {tally.president && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-200">
              <Star className="h-7 w-7 fill-amber-700 text-amber-700" strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <span className="text-sm font-bold text-amber-900">
                {presidentChanged ? "Presidente actual" : "Presidente electo de la Facultad (Art. 63)"}
              </span>
              <h3 className="text-2xl font-bold text-amber-950">
                {presidentChanged ? composition!.president.fullName : tally.president.fullName}
              </h3>
              <p className="text-sm text-amber-900">
                Brigada {presidentChanged ? composition!.president.brigadeCode : tally.president.brigadeCode}
              </p>
              {presidentChanged && (
                <p className="mt-1 text-sm text-amber-900">Presidente electo: {tally.president.fullName}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-feu-green-300 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-feu-green-200 bg-feu-green-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-feu-green-900">Votos por candidato</h3>
            <p className="text-sm text-feu-green-800">Ordenados según la boleta.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              <span>Descargar CSV</span>
            </Button>
            {canProclaim && (
              <Button asChild>
                <a href="/api/acta" download="acta-escrutinio-feu.pdf">
                  <FileText className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  <span>Descargar acta en PDF</span>
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-feu-green-200 bg-feu-green-100 text-sm font-bold text-feu-green-900">
              <tr>
                <th scope="col" className="px-4 py-3">Candidato</th>
                <th scope="col" className="w-24 px-4 py-3 text-center">Brigada</th>
                <th scope="col" className="w-36 px-4 py-3 text-center">Votos para miembro</th>
                <th scope="col" className="w-36 px-4 py-3 text-center">Votos para presidente</th>
                <th scope="col" className="w-40 px-4 py-3 text-center">Condición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-feu-green-100 text-feu-green-900">
              {tally.totals.map((t) => (
                <tr key={t.candidateId} className={t.isPresident ? "bg-amber-50 font-semibold" : t.isElected ? "bg-emerald-50/60" : ""}>
                  <td className="px-4 py-3 font-semibold">{t.fullName}</td>
                  <td className="px-4 py-3 text-center font-mono">{t.brigadeCode}</td>
                  <td className="px-4 py-3 text-center font-bold">{t.memberVotes}</td>
                  <td className="px-4 py-3 text-center font-bold text-amber-900">{t.presidentVotes}</td>
                  <td className="px-4 py-3 text-center">
                    {t.isPresident ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                        <Star className="h-3.5 w-3.5 fill-amber-900" strokeWidth={2} aria-hidden="true" />
                        <span>Presidente</span>
                      </span>
                    ) : t.isElected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        <span>Electo</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">No electo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAuthority && status === "PROCLAMADA" && (
        <div className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-feu-green-900">Designación del Vicepresidente (Art. 67)</h3>
          <p className="mt-1 text-sm text-gray-700">
            El Vicepresidente no se vota en la boleta: lo designa la Comisión Electoral entre los miembros electos después de
            la proclamación.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="vpSelect" className="mb-1 block text-sm font-semibold text-gray-800">
                Miembro electo
              </label>
              <select id="vpSelect" value={selectedVpId} onChange={(e) => setSelectedVpId(e.target.value)} className={inputCls}>
                <option value="">Seleccione un miembro electo</option>
                {eligibleForVp.map((c) => (
                  <option key={c.candidateId} value={c.candidateId}>
                    {c.fullName} (Brigada {c.brigadeCode})
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleDesignateVp}>Designar vicepresidente</Button>
          </div>
          {vpDesignationMsg && (
            <p
              role={vpDesignationMsg.success ? "status" : "alert"}
              className={`mt-3 text-sm font-semibold ${vpDesignationMsg.success ? "text-emerald-900" : "text-red-800"}`}
            >
              {vpDesignationMsg.message}
            </p>
          )}
        </div>
      )}

      {composition && (
        <div className="space-y-4 rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Secretariado de la Facultad</h3>
              <p className="text-sm text-gray-700">Última actualización: {formatDateTime(composition.updatedAt)}</p>
            </div>
            {isAuthority && (
              <Button variant="secondary" onClick={() => setShowVacancyForm(!showVacancyForm)} aria-expanded={showVacancyForm}>
                {showVacancyForm ? (
                  <>
                    <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    <span>Cerrar formulario</span>
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    <span>Registrar vacante en la Presidencia</span>
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <span className="text-xs font-bold text-amber-900">Presidente</span>
              <p className="mt-0.5 text-sm font-bold text-amber-950">{composition.president.fullName}</p>
              <p className="text-xs text-amber-900">Brigada {composition.president.brigadeCode}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <span className="text-xs font-bold text-blue-900">Vicepresidente</span>
              <p className="mt-0.5 text-sm font-bold text-blue-950">
                {composition.vicePresident ? (
                  composition.vicePresident.fullName
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    <span>Cargo sin cubrir</span>
                  </span>
                )}
              </p>
              <p className="text-xs text-blue-900">
                {composition.vicePresident ? `Brigada ${composition.vicePresident.brigadeCode}` : "Pendiente de designación"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <span className="text-xs font-bold text-gray-700">Miembros</span>
              <p className="mt-0.5 text-sm font-bold text-gray-900">{composition.members.length} miembros</p>
            </div>
          </div>

          {showVacancyForm && (
            <div className="mt-4 space-y-3 rounded-xl border border-amber-300 bg-amber-50/50 p-5">
              <h4 className="text-sm font-bold text-amber-950">Vacante en la Presidencia y sucesión</h4>
              <p className="text-sm text-gray-700">
                Si la Presidencia queda vacante, asume por defecto el Vicepresidente (Art. 102). La Comisión también puede
                proponer a otro miembro electo.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="vacancy-reason" className="mb-1 block text-sm font-semibold text-gray-800">
                    Motivo de la vacante
                  </label>
                  <select
                    id="vacancy-reason"
                    value={vacancyReason}
                    onChange={(e) => setVacancyReason(e.target.value as VacancyReason)}
                    className={inputCls}
                  >
                    <option value="DIMISION_VOLUNTARIA">Renuncia voluntaria (Art. 99)</option>
                    <option value="SEPARACION_DISCIPLINARIA">Separación disciplinaria (Art. 101, requiere aprobación del Consejo)</option>
                    <option value="GRADUACION_O_BAJA">Baja o graduación</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="vacancy-successor" className="mb-1 block text-sm font-semibold text-gray-800">
                    Quién asume la Presidencia (Art. 102)
                  </label>
                  <select
                    id="vacancy-successor"
                    value={successorCandidateId}
                    onChange={(e) => setSuccessorCandidateId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">
                      El Vicepresidente ({composition.vicePresident?.fullName || "cargo sin cubrir"})
                    </option>
                    {composition.members.map((m) => (
                      <option key={m.candidateId} value={m.candidateId}>
                        {m.fullName} (Brigada {m.brigadeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {vacancyReason === "SEPARACION_DISCIPLINARIA" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="council-attendance" className="mb-1 block text-sm font-semibold text-gray-800">
                      Asistencia al Consejo (%)
                    </label>
                    <input
                      id="council-attendance"
                      type="number"
                      min={0}
                      max={100}
                      value={councilAttendance}
                      onChange={(e) => setCouncilAttendance(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="council-favor" className="mb-1 block text-sm font-semibold text-gray-800">
                      Votos a favor en el Consejo (%)
                    </label>
                    <input
                      id="council-favor"
                      type="number"
                      min={0}
                      max={100}
                      value={councilInFavor}
                      onChange={(e) => setCouncilInFavor(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="vacancy-justification" className="mb-1 block text-sm font-semibold text-gray-800">
                  Motivo detallado y referencia del acta
                </label>
                <textarea
                  id="vacancy-justification"
                  rows={2}
                  value={vacancyJustification}
                  onChange={(e) => setVacancyJustification(e.target.value)}
                  placeholder="Por ejemplo: renuncia por motivos académicos, acta n.º 3 de la reunión del Secretariado"
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowVacancyForm(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleProcessPresidentialVacancy} disabled={isProcessingVacancy}>
                  {isProcessingVacancy ? "Registrando…" : "Registrar vacante"}
                </Button>
              </div>
            </div>
          )}

          {composition.vicePresident === null && isAuthority && (
            <div className="mt-4 space-y-2 rounded-xl border border-blue-300 bg-blue-50/50 p-4">
              <h4 className="text-sm font-bold text-blue-950">Designación de un nuevo Vicepresidente</h4>
              <p className="text-sm text-gray-700">
                El cargo de Vicepresidente está sin cubrir. La Comisión Electoral debe designar a un miembro electo.
              </p>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="new-vp" className="mb-1 block text-sm font-semibold text-gray-800">
                    Miembro electo
                  </label>
                  <select id="new-vp" value={newVpSuccessorId} onChange={(e) => setNewVpSuccessorId(e.target.value)} className={inputCls}>
                    <option value="">Seleccione un miembro electo</option>
                    {composition.members.map((m) => (
                      <option key={m.candidateId} value={m.candidateId}>
                        {m.fullName} (Brigada {m.brigadeCode})
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleDesignateSuccessorVp} disabled={isDesignatingNewVp}>
                  {isDesignatingNewVp ? "Designando…" : "Designar vicepresidente"}
                </Button>
              </div>
            </div>
          )}

          {vacancyMsg && (
            <div
              role={vacancyMsg.success ? "status" : "alert"}
              className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm font-medium ${
                vacancyMsg.success ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {vacancyMsg.success ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2} aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" strokeWidth={2} aria-hidden="true" />
              )}
              <span>{vacancyMsg.message}</span>
            </div>
          )}

          {composition.historicalEvents.length > 0 && (
            <div className="border-t border-gray-100 pt-2">
              <h4 className="mb-1 text-sm font-bold text-gray-800">Historial de cambios</h4>
              <ul className="space-y-1">
                {composition.historicalEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-col rounded-md border border-gray-100 bg-gray-50 p-2 text-sm text-gray-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>{describeEvent(ev)}</span>
                    <span className="text-xs text-gray-600">{formatDate(ev.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {canProclaim && (
        <div className="rounded-xl border border-feu-green-300 bg-white p-8 shadow-sm print:m-0 print:border-none print:p-0">
          <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-16 shrink-0">
                <Image src="/logos/feu_512.png" alt="Logo FEU" fill className="object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Acta de escrutinio y proclamación</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-bold text-feu-carmesi-500">FEU</span> · Facultad de Ingeniería Informática, CUJAE
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button asChild>
                <a href="/api/acta" download="acta-escrutinio-feu.pdf">
                  <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  <span>Descargar PDF</span>
                </a>
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span>Imprimir</span>
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-900">
            <p>
              La Comisión Electoral de la Facultad de Ingeniería Informática de la Universidad Tecnológica de La Habana
              &quot;José Antonio Echeverría&quot; (CUJAE) certifica el resultado de la elección del Secretariado de la
              Facultad.
            </p>
            <ul className="space-y-1 rounded-lg bg-gray-50 p-4">
              <li><strong>Electores con derecho al voto:</strong> {totalEligible}</li>
              <li><strong>Electores que votaron:</strong> {quorum.participations}</li>
              <li><strong>Participación:</strong> {formatPct(quorum.participationPct)}</li>
              <li>
                <strong>Quórum requerido (más del {formatPct(minParticipationPercentage)}):</strong>{" "}
                {quorum.quorumMet ? "alcanzado" : "no alcanzado"}
              </li>
              <li>
                <strong>Presidente:</strong> {composition?.president?.fullName || tally.president?.fullName || "—"}
                {presidentChanged && ` (presidente electo: ${tally.president?.fullName})`}
              </li>
              <li>
                <strong>Vicepresidente:</strong> {composition?.vicePresident?.fullName || "Pendiente de designación (Art. 67)"}
              </li>
              <li><strong>Miembros electos del Secretariado:</strong> {tally.elected.length}</li>
            </ul>
            {tieResolution && (
              <p>
                El empate fue resuelto por la Comisión Electoral (acta {tieResolution.acta}):{" "}
                {tieResolution.justification.trim().replace(/\.+$/, "")}.
              </p>
            )}
            <p>
              Verificadas las condiciones de participación y el secreto del voto según los artículos 38, 40, 59, 61 y 63 del
              Reglamento de la <span className="font-bold text-feu-carmesi-500">FEU</span>, la Comisión Electoral firma y da
              por válidos estos resultados.
            </p>

            {commission.length === 0 ? (
              <p className="mt-6 text-sm text-gray-700">La Comisión Electoral aún no está registrada; no hay firmas que mostrar.</p>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 pt-6 text-center text-sm sm:grid-cols-3">
                {commission.map((m) => (
                  <div key={`${m.office}-${m.name}`} className="border-t border-gray-500 pt-2">
                    <p className="font-bold">{m.name}</p>
                    <p className="text-xs text-gray-700">{officeLabel(m.office)} de la Comisión Electoral</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
