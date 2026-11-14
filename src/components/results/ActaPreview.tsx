"use client";

import Image from "next/image";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPct, officeLabel } from "@/lib/status-labels";
import type { CommissionMember, TallyQuorum, TieResolution } from "./types";

/** Vista en pantalla del acta de escrutinio y proclamación (el PDF oficial lo genera el servidor). */
export function ActaPreview({
  quorum,
  totalEligible,
  minParticipationPercentage,
  presidentName,
  electedPresidentName,
  vicePresidentName,
  electedCount,
  tieResolution,
  commission,
}: {
  quorum: TallyQuorum;
  totalEligible: number;
  minParticipationPercentage: number;
  presidentName: string;
  /** Presente solo si el presidente actual no es el electo. */
  electedPresidentName: string | null;
  vicePresidentName: string | null;
  electedCount: number;
  tieResolution: TieResolution | null;
  commission: CommissionMember[];
}) {
  const rows: Array<[string, string]> = [
    ["Electores con derecho al voto", String(totalEligible)],
    ["Electores que votaron", String(quorum.participations)],
    ["Participación", formatPct(quorum.participationPct)],
    [`Quórum requerido (más del ${formatPct(minParticipationPercentage)})`, quorum.quorumMet ? "alcanzado" : "no alcanzado"],
    ["Presidente", presidentName + (electedPresidentName ? ` (presidente electo: ${electedPresidentName})` : "")],
    ["Vicepresidente", vicePresidentName || "Pendiente de designación (Art. 67)"],
    ["Miembros electos del Secretariado", String(electedCount)],
  ];

  return (
    <Card className="p-6 sm:p-8 print:m-0 print:border-none print:p-0">
      <div className="flex flex-col gap-3 border-b border-line-strong pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logos/feu_512.png" alt="Logo FEU" width={40} height={40} className="shrink-0 object-contain" />
          <div>
            <h3 className="text-lg font-bold text-ink-900">Acta de escrutinio y proclamación</h3>
            <p className="text-sm text-ink-700">
              <span className="font-bold text-feu-carmesi-500">FEU</span>, Facultad de Ingeniería Informática, CUJAE
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
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

      <div className="mt-5 space-y-4 font-serif text-base leading-relaxed text-ink-900">
        <p>
          La Comisión Electoral de la Facultad de Ingeniería Informática de la Universidad Tecnológica de La Habana &quot;José
          Antonio Echeverría&quot; (CUJAE) certifica el resultado de la elección del Secretariado de la Facultad.
        </p>
        <dl className="divide-y divide-line border-y border-line font-sans text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-ink-600">{k}</dt>
              <dd className="font-semibold tabular-nums sm:text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {tieResolution && (
          <p>
            El empate fue resuelto por la Comisión Electoral (acta {tieResolution.acta}):{" "}
            {tieResolution.justification.trim().replace(/\.+$/, "")}.
          </p>
        )}
        <p>
          Verificadas las condiciones de participación y el secreto del voto según los artículos 38, 40, 59, 61 y 63 del
          Reglamento de la <span className="font-sans font-bold text-feu-carmesi-500">FEU</span>, la Comisión Electoral firma y da
          por válidos estos resultados.
        </p>

        {commission.length === 0 ? (
          <p className="font-sans text-sm text-ink-700">La Comisión Electoral aún no está registrada; no hay firmas que mostrar.</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 pt-10 text-center font-sans text-sm sm:grid-cols-3">
            {commission.map((m) => (
              <div key={`${m.office}-${m.name}`} className="border-t border-ink-700 pt-2">
                <p className="font-bold">{m.name}</p>
                <p className="text-xs text-ink-600">{officeLabel(m.office)} de la Comisión Electoral</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
