"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { fieldCls, labelCls } from "@/components/comision/shared";
import { CONNECTION_ERROR, type TallyView, type TieResolution } from "./types";

/** Empate pendiente: explicación y, para la Comisión, formulario de decisión. */
export function TieResolutionPanel({
  tally,
  isAuthority,
  onResolved,
}: {
  tally: TallyView & { tie: NonNullable<TallyView["tie"]> };
  isAuthority: boolean;
  onResolved: () => Promise<void> | void;
}) {
  const confirm = useConfirm();
  const [chosen, setChosen] = useState<string[]>([]);
  const [president, setPresident] = useState("");
  const [justification, setJustification] = useState("");
  const [acta, setActa] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const tie = tally.tie;
  const nameOf = (id: string) => tally.totals.find((t) => t.candidateId === id)?.fullName ?? id;

  const handleResolve = async () => {
    setMsg(null);
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
          ...(chosen.length ? { electedIds: chosen } : {}),
          ...(president ? { presidentId: president } : {}),
          justification,
          acta,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.issues?.[0] ?? data.error ?? "No se pudo resolver el empate.");
        return;
      }
      await onResolved();
    } catch {
      setMsg(CONNECTION_ERROR);
    }
  };

  return (
    <Card className="border-warn-200">
      <CardHeader className="border-warn-200 bg-warn-50">
        <CardTitle className="text-warn-900">
          {tie.type === "PRESIDENT" ? "Empate en la Presidencia" : "Empate en el último puesto del Secretariado"}
        </CardTitle>
        <CardDescription className="text-warn-900">
          Los votos para presidente no resolvieron el empate. La Comisión Electoral decide entre los candidatos empatados y
          deja constancia en acta. Los resultados no se proclaman hasta entonces.
        </CardDescription>
        <p className="mt-2 text-sm text-warn-900">
          Candidatos empatados: <strong>{tie.candidateIds.map(nameOf).join(", ")}</strong>
        </p>
      </CardHeader>

      {isAuthority && (
        <CardContent className="space-y-4">
          {tie.type === "CUT" && (
            <fieldset>
              <legend className="text-sm font-semibold text-ink-800">Candidatos que ocupan los puestos restantes</legend>
              <div className="mt-2 space-y-1">
                {tie.candidateIds.map((id) => (
                  <label key={id} className="flex min-h-11 items-center gap-2 text-sm text-ink-900">
                    <input
                      type="checkbox"
                      checked={chosen.includes(id)}
                      onChange={(e) => setChosen(e.target.checked ? [...chosen, id] : chosen.filter((x) => x !== id))}
                      className="h-5 w-5 accent-action"
                    />
                    {nameOf(id)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div>
            <label htmlFor="tie-president" className={labelCls}>
              Presidente{tie.type === "CUT" ? " (solo si vuelve a haber empate en la Presidencia)" : ""}
            </label>
            <select id="tie-president" value={president} onChange={(e) => setPresident(e.target.value)} className={fieldCls}>
              <option value="">Seleccione un candidato</option>
              {(tie.type === "PRESIDENT" ? tie.candidateIds : tally.totals.map((t) => t.candidateId)).map((id) => (
                <option key={id} value={id}>
                  {nameOf(id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tie-justification" className={labelCls}>
              Motivo de la decisión
            </label>
            <textarea
              id="tie-justification"
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="tie-acta" className={labelCls}>
              Acta de la Comisión
            </label>
            <Input
              id="tie-acta"
              value={acta}
              onChange={(e) => setActa(e.target.value)}
              placeholder="Número o referencia del acta"
              className="rounded-md text-sm"
            />
          </div>
          {msg && (
            <Alert role="alert" tone="danger">
              {msg}
            </Alert>
          )}
          <Button variant="danger" onClick={handleResolve}>
            Registrar decisión y proclamar
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export function TieResolutionNote({ resolution }: { resolution: TieResolution }) {
  return (
    <Alert tone="warn">
      El empate fue resuelto por la Comisión Electoral (acta {resolution.acta}): {resolution.justification}
    </Alert>
  );
}
