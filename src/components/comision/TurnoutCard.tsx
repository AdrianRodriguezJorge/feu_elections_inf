"use client";

import { useState } from "react";
import { Play, Square, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useConfirm } from "@/components/ui/confirm";
import { formatPct } from "@/lib/status-labels";
import { QuorumProgress, Stat } from "./shared";

export interface TurnoutSummary {
  status: string;
  totalEligible: number;
  totalVotes: number;
  validBallots: number;
  annulledBallots: number;
  participationPct: number;
  minParticipationPercentage: number;
  minVotesRequired: number;
  requirementMet: boolean;
}

/** Participación en curso y acciones de apertura y cierre de la votación. */
export function TurnoutCard({ summary, onRefresh }: { summary: TurnoutSummary; onRefresh: () => void }) {
  const confirm = useConfirm();
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

  const missingVotes = Math.max(0, summary.minVotesRequired - summary.totalVotes);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-xl">Participación en la elección</CardTitle>
          <CardDescription>Datos actualizados de la votación</CardDescription>
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
      </CardHeader>
      <CardContent className="space-y-6">
        {actionError && (
          <Alert role="alert" tone="danger">
            {actionError}
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Stat label="Electores habilitados" value={summary.totalEligible} />
          <Stat
            label="Votos emitidos"
            value={summary.totalVotes}
            note={`${summary.validBallots} válidos, ${summary.annulledBallots} anulados`}
          />
          <Stat
            label="Participación"
            value={formatPct(summary.participationPct)}
            note={`Se requiere más del ${formatPct(summary.minParticipationPercentage)}`}
          />
          <Stat
            label="Votos necesarios"
            value={summary.minVotesRequired}
            note={
              summary.requirementMet
                ? "Quórum alcanzado"
                : `Faltan ${missingVotes} ${missingVotes === 1 ? "voto" : "votos"}`
            }
          />
        </div>

        <QuorumProgress
          id="quorum-progress-label"
          votes={summary.totalVotes}
          required={summary.minVotesRequired}
          minPct={formatPct(summary.minParticipationPercentage)}
          met={summary.requirementMet}
        />
        <p className="flex items-start gap-2 text-sm text-ink-600">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Mientras la votación esté abierta nadie puede ver resultados parciales, y los votos no se asocian a ningún elector.</span>
        </p>
      </CardContent>
    </Card>
  );
}
