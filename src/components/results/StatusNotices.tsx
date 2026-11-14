"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { formatPct, statusLabel } from "@/lib/status-labels";
import { CONNECTION_ERROR } from "./types";

/** Aviso mientras la votación está abierta: no hay resultados parciales. */
export function VotingInProgressNotice({
  status,
  totalVotes,
  totalEligible,
  minParticipationPercentage,
}: {
  status: string;
  totalVotes: number;
  totalEligible: number;
  minParticipationPercentage: number;
}) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Lock className="h-5 w-5 shrink-0 text-ink-600" strokeWidth={2} aria-hidden="true" />
          Resultados no disponibles durante la votación
        </CardTitle>
        <CardDescription>
          Para proteger el secreto del voto, no se muestran resultados parciales mientras la votación esté abierta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-ink-800">
        <dl className="divide-y divide-line border-y border-line">
          {[
            ["Estado", statusLabel(status)],
            ["Votos emitidos", String(totalVotes)],
            ["Electores habilitados", String(totalEligible)],
            ["Participación mínima", `Más del ${formatPct(minParticipationPercentage)} (Art. 38)`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-ink-600">{k}</dt>
              <dd className="text-right font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-ink-600">
          Los resultados estarán disponibles cuando la Comisión Electoral cierre la votación y realice el escrutinio.
        </p>
      </CardContent>
    </Card>
  );
}

export function NotYetAvailableNotice() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="border-b-0">
        <CardTitle className="text-xl">Resultados aún no disponibles</CardTitle>
        <CardDescription>
          Los resultados se publican cuando la Comisión Electoral cierra la votación y realiza el escrutinio.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/** Acción única de escrutinio para la Comisión una vez cerrada la votación. */
export function RunTallyCard({ onDone }: { onDone: () => Promise<void> | void }) {
  const confirm = useConfirm();
  const [isTallying, setIsTallying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      if (res.ok) await onDone();
      else setErrorMsg(data.error || "No se pudo realizar el escrutinio.");
    } catch {
      setErrorMsg(CONNECTION_ERROR);
    } finally {
      setIsTallying(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">Escrutinio de la elección</CardTitle>
        <CardDescription>
          La votación ha concluido. Realice el escrutinio para contar los votos válidos y comprobar si se alcanzó el quórum.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <Alert role="alert" tone="danger">
            {errorMsg}
          </Alert>
        )}
        <Button onClick={handleRunTally} disabled={isTallying}>
          {isTallying ? "Realizando escrutinio…" : "Realizar escrutinio"}
        </Button>
      </CardContent>
    </Card>
  );
}
