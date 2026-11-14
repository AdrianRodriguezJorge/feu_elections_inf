"use client";

import type { ProcessCandidateSnapshot } from "@/domain/candidates";
import { TurnoutCard } from "@/components/comision/TurnoutCard";
import { AccountResetCard } from "@/components/comision/AccountResetCard";
import { PadronImportCard } from "@/components/comision/PadronImportCard";
import { QuorumCard, type QuorumInfo } from "@/components/comision/QuorumCard";
import { CandidatesList } from "@/components/comision/CandidatesList";
import { CommissionList, type CommissionMemberInfo } from "@/components/comision/CommissionList";

export type { QuorumInfo };

interface AdminPanelProps {
  summary: {
    status: string;
    seats: number;
    candidatesCount: number;
    totalEligible: number;
    totalVotes: number;
    validBallots: number;
    annulledBallots: number;
    participationPct: number;
    minParticipationPercentage: number;
    minVotesRequired: number;
    requirementMet: boolean;
    candidacyHash: string;
  };
  quorum: QuorumInfo;
  role: string;
  candidates: ProcessCandidateSnapshot[];
  commission: CommissionMemberInfo[];
  onRefresh: () => void;
}

/** Panel de la Comisión Electoral: compone las tarjetas de gestión del proceso. */
export function AdminPanel({ summary, quorum, role, candidates, commission, onRefresh }: AdminPanelProps) {
  const canAdjustQuorum = role === "ADMIN" && ["CONVOCADO", "ABIERTA", "CERRADA"].includes(summary.status);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TurnoutCard summary={summary} onRefresh={onRefresh} />
      <AccountResetCard />
      <div className="grid gap-6 md:grid-cols-2">
        <PadronImportCard effectivePct={quorum.effectivePct} onRefresh={onRefresh} />
        <QuorumCard quorum={quorum} seats={summary.seats} canAdjust={canAdjustQuorum} onRefresh={onRefresh} />
      </div>
      <CandidatesList candidates={candidates} seats={summary.seats} candidatesCount={summary.candidatesCount} />
      <CommissionList commission={commission} />
    </div>
  );
}
