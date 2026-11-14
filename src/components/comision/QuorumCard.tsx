"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { formatPct } from "@/lib/status-labels";
import { ActionResult, fieldCls, labelCls, type ActionMessage } from "./shared";

export interface QuorumInfo {
  basePct: number;
  effectivePct: number;
  exception: { pct: number; justification: string; acta: string; appliedBy: string; appliedAt: string } | null;
}

/** Quórum vigente y, para administración, aplicación de una excepción aprobada. */
export function QuorumCard({
  quorum,
  seats,
  canAdjust,
  onRefresh,
}: {
  quorum: QuorumInfo;
  seats: number;
  canAdjust: boolean;
  onRefresh: () => void;
}) {
  const confirm = useConfirm();
  const [pctInput, setPctInput] = useState(String(quorum.effectivePct));
  const [justification, setJustification] = useState("");
  const [acta, setActa] = useState("");
  const [msg, setMsg] = useState<ActionMessage | null>(null);

  const handleSave = async () => {
    setMsg(null);
    const pct = Number(pctInput);
    if (!Number.isFinite(pct) || pct < 80 || pct > 85) {
      setMsg({ ok: false, text: "El quórum debe estar entre el 80 % y el 85 %." });
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
        body: JSON.stringify({ pct, justification, acta }),
      });
      const data = await res.json();
      setMsg({ ok: res.ok, text: res.ok ? data.message : (data.issues?.[0] ?? data.error ?? "No se pudo guardar.") });
      if (res.ok) onRefresh();
    } catch {
      setMsg({ ok: false, text: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quórum de la elección</CardTitle>
        <CardDescription>
          La elección es válida con <strong className="text-ink-900">más del {formatPct(quorum.effectivePct)}</strong> de
          participación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-700">
        {quorum.exception ? (
          <Alert tone="warn">
            Excepción aprobada (acta {quorum.exception.acta}): {quorum.exception.justification}. La regla general del Art. 38
            para la Facultad es más del {formatPct(quorum.basePct)}.
          </Alert>
        ) : (
          <p>Regla general del Art. 38 para la Facultad.</p>
        )}
        <p>Puestos a elegir: {seats} (número de candidatos menos 2, Art. 59).</p>

        {canAdjust && (
          <div className="space-y-3 border-t border-line pt-4">
            <p>
              Solo si se aprobó una excepción. Puede aplicarse hasta antes del escrutinio, entre el 80 % y el 85 %. El 85 %
              restablece la regla general.
            </p>
            <div>
              <label htmlFor="quorum-pct" className={labelCls}>
                Quórum (%)
              </label>
              <Input
                id="quorum-pct"
                type="number"
                min={80}
                max={85}
                step={0.5}
                value={pctInput}
                onChange={(e) => setPctInput(e.target.value)}
                className="rounded-md text-sm"
              />
            </div>
            <div>
              <label htmlFor="quorum-justification" className={labelCls}>
                Motivo
              </label>
              <textarea
                id="quorum-justification"
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label htmlFor="quorum-acta" className={labelCls}>
                Acta o resolución que lo aprueba
              </label>
              <Input id="quorum-acta" value={acta} onChange={(e) => setActa(e.target.value)} className="rounded-md text-sm" />
            </div>
            <Button className="w-full" onClick={handleSave}>
              Aplicar quórum
            </Button>
            <ActionResult msg={msg} className="mt-0" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
