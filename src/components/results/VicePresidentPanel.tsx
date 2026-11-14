"use client";

import { useState } from "react";
import type { SecretariatComposition } from "@/domain/vacancies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { ActionResult, fieldCls, labelCls, type ActionMessage } from "@/components/comision/shared";
import { CONNECTION_ERROR, type EnrichedTotal } from "./types";

/** Designación del Vicepresidente por la Comisión tras la proclamación (Art. 67). */
export function VicePresidentPanel({
  eligible,
  designatedVpId,
  onComposition,
  onRefresh,
}: {
  eligible: EnrichedTotal[];
  designatedVpId: string;
  onComposition: (c: SecretariatComposition) => void;
  onRefresh: () => void;
}) {
  const confirm = useConfirm();
  const [selectedVpId, setSelectedVpId] = useState(designatedVpId);
  const [msg, setMsg] = useState<ActionMessage | null>(null);

  const handleDesignate = async () => {
    setMsg(null);
    if (!selectedVpId) {
      setMsg({ ok: false, text: "Seleccione un miembro electo para la Vicepresidencia." });
      return;
    }
    const name = eligible.find((t) => t.candidateId === selectedVpId)?.fullName ?? "";
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
        setMsg({ ok: true, text: data.message });
        if (data.composition) onComposition(data.composition);
        onRefresh();
      } else {
        setMsg({ ok: false, text: data.error || "No se pudo designar al vicepresidente." });
      }
    } catch {
      setMsg({ ok: false, text: CONNECTION_ERROR });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Designación del Vicepresidente (Art. 67)</CardTitle>
        <CardDescription>
          El Vicepresidente no se vota en la boleta: lo designa la Comisión Electoral entre los miembros electos después de la
          proclamación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="vpSelect" className={labelCls}>
              Miembro electo
            </label>
            <select id="vpSelect" value={selectedVpId} onChange={(e) => setSelectedVpId(e.target.value)} className={fieldCls}>
              <option value="">Seleccione un miembro electo</option>
              {eligible.map((c) => (
                <option key={c.candidateId} value={c.candidateId}>
                  {c.fullName} (Brigada {c.brigadeCode})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleDesignate}>Designar vicepresidente</Button>
        </div>
        <ActionResult msg={msg} />
      </CardContent>
    </Card>
  );
}
