"use client";

import { useState } from "react";
import type { SecretariatComposition, VacancyEvent, VacancyReason } from "@/domain/vacancies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { ActionResult, fieldCls, labelCls, type ActionMessage } from "@/components/comision/shared";
import { VACANCY_REASON_LABELS, formatDate, formatDateTime } from "@/lib/status-labels";
import { CONNECTION_ERROR } from "./types";

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

function MemberOptions({ composition }: { composition: SecretariatComposition }) {
  return (
    <>
      {composition.members.map((m) => (
        <option key={m.candidateId} value={m.candidateId}>
          {m.fullName} (Brigada {m.brigadeCode})
        </option>
      ))}
    </>
  );
}

/** Composición vigente del Secretariado, vacantes en la Presidencia y sucesión en la Vicepresidencia. */
export function VacancyPanel({
  composition,
  isAuthority,
  onComposition,
  onRefresh,
}: {
  composition: SecretariatComposition;
  isAuthority: boolean;
  onComposition: (c: SecretariatComposition) => void;
  onRefresh: () => void;
}) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState<VacancyReason>("DIMISION_VOLUNTARIA");
  const [justification, setJustification] = useState("");
  const [successorId, setSuccessorId] = useState("");
  const [attendance, setAttendance] = useState("");
  const [inFavor, setInFavor] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [newVpId, setNewVpId] = useState("");
  const [isDesignating, setIsDesignating] = useState(false);
  const [msg, setMsg] = useState<ActionMessage | null>(null);

  const postVacancy = async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch("/api/comision/vacante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error });
        return false;
      }
      onComposition(data.composition);
      setMsg({ ok: true, text: data.message });
      onRefresh();
      return true;
    } catch {
      setMsg({ ok: false, text: CONNECTION_ERROR });
      return false;
    }
  };

  const handleVacancy = async () => {
    if (!justification.trim()) {
      setMsg({ ok: false, text: "Escriba el motivo de la vacante." });
      return;
    }
    if (reason === "SEPARACION_DISCIPLINARIA" && (!attendance || !inFavor)) {
      setMsg({
        ok: false,
        text: "La separación disciplinaria exige indicar la asistencia y los votos a favor del Consejo según el acta.",
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
    setIsProcessing(true);
    setMsg(null);
    const done = await postVacancy({
      type: "VACANCIA_PRESIDENTE",
      reason,
      justification,
      successorCandidateId: successorId || undefined,
      councilAttendancePct: attendance ? Number(attendance) : undefined,
      councilVotesInFavorPct: inFavor ? Number(inFavor) : undefined,
    });
    if (done) {
      setShowForm(false);
      setJustification("");
    }
    setIsProcessing(false);
  };

  const handleNewVp = async () => {
    setMsg(null);
    if (!newVpId) {
      setMsg({ ok: false, text: "Seleccione un miembro del Secretariado para la Vicepresidencia." });
      return;
    }
    const name = composition.members.find((m) => m.candidateId === newVpId)?.fullName ?? "";
    const ok = await confirm({
      title: "¿Designar vicepresidente?",
      description: `Se designará a ${name} como nuevo Vicepresidente del Secretariado.`,
      confirmLabel: "Designar vicepresidente",
    });
    if (!ok) return;
    setIsDesignating(true);
    const done = await postVacancy({
      type: "DESIGNAR_NUEVO_VP",
      successorCandidateId: newVpId,
      justification: "Designación de nueva Vicepresidencia (Art. 67)",
    });
    if (done) setNewVpId("");
    setIsDesignating(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Secretariado de la Facultad</CardTitle>
          <CardDescription>Última actualización: {formatDateTime(composition.updatedAt)}</CardDescription>
        </div>
        {isAuthority && (
          <Button variant="secondary" onClick={() => setShowForm(!showForm)} aria-expanded={showForm}>
            {showForm ? "Cerrar formulario" : "Registrar vacante en la Presidencia"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border-l border-line pl-4">
            <dt className="text-sm text-ink-600">Presidente</dt>
            <dd className="mt-1 font-bold text-ink-900">{composition.president.fullName}</dd>
            <dd className="text-xs text-ink-600">Brigada {composition.president.brigadeCode}</dd>
          </div>
          <div className="border-l border-line pl-4">
            <dt className="text-sm text-ink-600">Vicepresidente</dt>
            {composition.vicePresident ? (
              <>
                <dd className="mt-1 font-bold text-ink-900">{composition.vicePresident.fullName}</dd>
                <dd className="text-xs text-ink-600">Brigada {composition.vicePresident.brigadeCode}</dd>
              </>
            ) : (
              <dd className="mt-1">
                <Badge tone="warn">Cargo sin cubrir</Badge>
                <span className="mt-1 block text-xs text-ink-600">Pendiente de designación</span>
              </dd>
            )}
          </div>
          <div className="border-l border-line pl-4">
            <dt className="text-sm text-ink-600">Miembros</dt>
            <dd className="mt-1 font-bold tabular-nums text-ink-900">{composition.members.length} miembros</dd>
          </div>
        </dl>

        {showForm && (
          <div className="space-y-3 rounded-md border border-warn-200 bg-warn-50 p-4">
            <h4 className="font-bold text-warn-900">Vacante en la Presidencia y sucesión</h4>
            <p className="text-sm text-ink-700">
              Si la Presidencia queda vacante, asume por defecto el Vicepresidente (Art. 102). La Comisión también puede
              proponer a otro miembro electo.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="vacancy-reason" className={labelCls}>
                  Motivo de la vacante
                </label>
                <select
                  id="vacancy-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as VacancyReason)}
                  className={fieldCls}
                >
                  <option value="DIMISION_VOLUNTARIA">Renuncia voluntaria (Art. 99)</option>
                  <option value="SEPARACION_DISCIPLINARIA">Separación disciplinaria (Art. 101, requiere aprobación del Consejo)</option>
                  <option value="GRADUACION_O_BAJA">Baja o graduación</option>
                </select>
              </div>
              <div>
                <label htmlFor="vacancy-successor" className={labelCls}>
                  Quién asume la Presidencia (Art. 102)
                </label>
                <select id="vacancy-successor" value={successorId} onChange={(e) => setSuccessorId(e.target.value)} className={fieldCls}>
                  <option value="">El Vicepresidente ({composition.vicePresident?.fullName || "cargo sin cubrir"})</option>
                  <MemberOptions composition={composition} />
                </select>
              </div>
            </div>

            {reason === "SEPARACION_DISCIPLINARIA" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="council-attendance" className={labelCls}>
                    Asistencia al Consejo (%)
                  </label>
                  <Input
                    id="council-attendance"
                    type="number"
                    min={0}
                    max={100}
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value)}
                    className="rounded-md text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="council-favor" className={labelCls}>
                    Votos a favor en el Consejo (%)
                  </label>
                  <Input
                    id="council-favor"
                    type="number"
                    min={0}
                    max={100}
                    value={inFavor}
                    onChange={(e) => setInFavor(e.target.value)}
                    className="rounded-md text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="vacancy-justification" className={labelCls}>
                Motivo detallado y referencia del acta
              </label>
              <textarea
                id="vacancy-justification"
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Por ejemplo: renuncia por motivos académicos, acta n.º 3 de la reunión del Secretariado"
                className={fieldCls}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleVacancy} disabled={isProcessing}>
                {isProcessing ? "Registrando…" : "Registrar vacante"}
              </Button>
            </div>
          </div>
        )}

        {composition.vicePresident === null && isAuthority && (
          <div className="space-y-2 border-t border-line pt-4">
            <h4 className="font-bold text-ink-900">Designación de un nuevo Vicepresidente</h4>
            <p className="text-sm text-ink-700">
              El cargo de Vicepresidente está sin cubrir. La Comisión Electoral debe designar a un miembro electo.
            </p>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="new-vp" className={labelCls}>
                  Miembro electo
                </label>
                <select id="new-vp" value={newVpId} onChange={(e) => setNewVpId(e.target.value)} className={fieldCls}>
                  <option value="">Seleccione un miembro electo</option>
                  <MemberOptions composition={composition} />
                </select>
              </div>
              <Button onClick={handleNewVp} disabled={isDesignating}>
                {isDesignating ? "Designando…" : "Designar vicepresidente"}
              </Button>
            </div>
          </div>
        )}

        <ActionResult msg={msg} className="mt-0" />

        {composition.historicalEvents.length > 0 && (
          <div className="border-t border-line pt-4">
            <h4 className="mb-2 font-bold text-ink-900">Historial de cambios</h4>
            <ul className="divide-y divide-line text-sm text-ink-800">
              {composition.historicalEvents.map((ev) => (
                <li key={ev.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{describeEvent(ev)}</span>
                  <span className="shrink-0 text-xs text-ink-600">{formatDate(ev.timestamp)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
