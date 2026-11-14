import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPct } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import type { TallyQuorum } from "./types";

/** Dictamen de validez de la elección según el quórum (Art. 38). */
export function QuorumSummary({
  quorum,
  totalEligible,
  minParticipationPercentage,
}: {
  quorum: TallyQuorum;
  totalEligible: number;
  minParticipationPercentage: number;
}) {
  return (
    <Card className={cn(!quorum.quorumMet && "border-danger-200")}>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge tone={quorum.quorumMet ? "action" : "danger"}>
            {quorum.quorumMet ? "Quórum alcanzado" : "Quórum no alcanzado"}
          </Badge>
          <h2 className={cn("mt-2 text-xl font-bold", quorum.quorumMet ? "text-ink-900" : "text-danger-900")}>
            {quorum.quorumMet ? "La elección es válida (Art. 38)" : "La elección no es válida por falta de quórum (Art. 38)"}
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            Participó el <strong>{formatPct(quorum.participationPct)}</strong> ({quorum.participations} de {totalEligible}{" "}
            electores). Se requería más del {formatPct(minParticipationPercentage)}.
          </p>
        </div>
        <div className="sm:border-l sm:border-line sm:pl-6 sm:text-right">
          <p className="text-sm text-ink-600">Participación</p>
          <p className="text-3xl font-bold tabular-nums text-ink-900">{formatPct(quorum.participationPct)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
