"use client";

import { ObserverPanel } from "@/components/ObserverPanel";
import { useElection } from "@/components/ElectionProvider";
import { ElectionGate } from "./ElectionGate";

export function ObservacionView() {
  const { reload } = useElection();
  return (
    <ElectionGate>
      {(d) => (
        <ObserverPanel
          status={d.summary.status}
          totalVotes={d.summary.totalVotes}
          totalEligible={d.summary.totalEligible}
          validBallots={d.summary.validBallots}
          annulledBallots={d.summary.annulledBallots}
          participationPct={d.summary.participationPct}
          minParticipationPercentage={d.summary.minParticipationPercentage}
          minVotesRequired={d.summary.minVotesRequired}
          requirementMet={d.summary.requirementMet}
          brigadeTurnout={d.brigadeTurnout}
          candidatesCount={d.summary.candidatesCount}
          seats={d.summary.seats}
          onRefresh={reload}
        />
      )}
    </ElectionGate>
  );
}
