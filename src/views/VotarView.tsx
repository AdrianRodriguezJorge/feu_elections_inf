"use client";

import { VoterBallot } from "@/components/VoterBallot";
import { useElection } from "@/components/ElectionProvider";
import { ElectionGate } from "./ElectionGate";

export function VotarView() {
  const { user, reload } = useElection();
  return (
    <ElectionGate>
      {(d) => (
        <VoterBallot candidates={d.candidates} seats={d.summary.seats} me={d.me} onVoteCast={reload} currentUser={user} status={d.summary.status} />
      )}
    </ElectionGate>
  );
}
