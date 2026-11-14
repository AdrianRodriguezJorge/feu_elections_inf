"use client";

import { ResultsPanel } from "@/components/ResultsPanel";
import { useElection } from "@/components/ElectionProvider";
import { ElectionGate } from "./ElectionGate";

export function ResultadosView() {
  const { user, reload } = useElection();
  return (
    <ElectionGate>
      {(d) => (
        <ResultsPanel
          status={d.summary.status}
          role={user.role}
          totalVotes={d.summary.totalVotes}
          totalEligible={d.summary.totalEligible}
          minParticipationPercentage={d.summary.minParticipationPercentage}
          onRefresh={reload}
        />
      )}
    </ElectionGate>
  );
}
