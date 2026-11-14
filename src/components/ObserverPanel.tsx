"use client";

import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { ReceiptVerifierModal } from "@/components/ReceiptVerifierModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuorumProgress, Stat, labelCls } from "@/components/comision/shared";
import { formatPct, statusLabel } from "@/lib/status-labels";

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
  brigadeTurnout,
  candidatesCount,
  seats,
  onRefresh,
}: ObserverPanelProps) {
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [testReceiptHash, setTestReceiptHash] = useState("");
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const missing = Math.max(0, minVotesRequired - totalVotes);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Observación de la elección</CardTitle>
            <CardDescription>
              Desde aquí puede seguir la jornada electoral y la participación, conforme al Art. 43 h del ABC de la{" "}
              <span className="font-bold text-feu-carmesi-500">FEU</span>.
            </CardDescription>
          </div>
          <Button variant="secondary" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            <span>Actualizar datos</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            <Stat label="Estado de la elección" value={<span className="text-lg">{statusLabel(status)}</span>} />
            <Stat label="Electores habilitados" value={totalEligible} />
            <Stat label="Votos emitidos" value={totalVotes} note={`${validBallots} válidos, ${annulledBallots} anulados`} />
            <Stat
              label="Participación"
              value={formatPct(participationPct)}
              note={requirementMet ? "Quórum alcanzado" : `Faltan ${missing} ${missing === 1 ? "voto" : "votos"}`}
            />
          </div>
          <QuorumProgress
            id="obs-progress-label"
            votes={totalVotes}
            required={minVotesRequired}
            minPct={formatPct(minParticipationPercentage)}
            met={requirementMet}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Participación por brigada</CardTitle>
            <CardDescription>Solo se muestran totales; no se identifica a ningún elector.</CardDescription>
          </div>
          <span className="shrink-0 text-sm text-ink-600">
            {brigadeTurnout.length} {brigadeTurnout.length === 1 ? "brigada" : "brigadas"}
          </span>
        </CardHeader>
        {brigadeTurnout.length === 0 ? (
          <CardContent>
            <p className="text-sm text-ink-700">Todavía no hay electores registrados.</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-900">
              <thead className="border-b border-line-strong text-ink-700">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Brigada</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Han votado</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Electores</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Participación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {brigadeTurnout.map((b) => {
                  const pct = b.total > 0 ? Math.round((b.voted / b.total) * 100) : 0;
                  return (
                    <tr key={b.code}>
                      <th scope="row" className="px-5 py-2.5 font-semibold">Brigada {b.code}</th>
                      <td className="px-4 py-2.5 text-right tabular-nums">{b.voted}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{b.total}</td>
                      <td className="px-5 py-2.5 text-right font-bold tabular-nums">{formatPct(pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verificar un comprobante</CardTitle>
          <CardDescription>
            Puede comprobar que un comprobante corresponde a una boleta depositada en la urna. La verificación nunca revela
            quién votó ni qué votó.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setReceiptError(null);
              if (!testReceiptHash.trim()) {
                setReceiptError("Escriba el código del comprobante.");
                return;
              }
              setVerifierOpen(true);
            }}
          >
            <div className="flex-1">
              <label htmlFor="observer-receipt" className={labelCls}>
                Código del comprobante
              </label>
              <Input
                id="observer-receipt"
                type="text"
                value={testReceiptHash}
                onChange={(e) => setTestReceiptHash(e.target.value)}
                aria-invalid={receiptError ? true : undefined}
                aria-describedby={receiptError ? "observer-receipt-error" : undefined}
                className="rounded-md font-mono text-sm"
              />
            </div>
            <Button type="submit">
              <Search className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              <span>Verificar comprobante</span>
            </Button>
          </form>
          {receiptError && (
            <Alert id="observer-receipt-error" role="alert" tone="danger">
              {receiptError}
            </Alert>
          )}

          <dl className="space-y-3 border-t border-line pt-4 text-sm text-ink-700">
            <div>
              <dt className="font-semibold text-ink-900">Puestos a elegir</dt>
              <dd>
                {seats}, de {candidatesCount} candidaturas (Art. 59: candidatos menos 2).
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-900">Secreto del voto</dt>
              <dd>
                Las boletas se guardan sin el nombre, el carné ni la hora de quien votó. El registro de participación solo
                indica quién ya votó, no qué boleta depositó.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {verifierOpen && <ReceiptVerifierModal receiptHash={testReceiptHash} onClose={() => setVerifierOpen(false)} />}
    </div>
  );
}
