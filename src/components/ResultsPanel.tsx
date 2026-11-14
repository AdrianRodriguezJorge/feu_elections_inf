"use client";

import { useCallback, useEffect, useState } from "react";
import type { SecretariatComposition } from "@/domain/vacancies";
import { NotYetAvailableNotice, RunTallyCard, VotingInProgressNotice } from "@/components/results/StatusNotices";
import { QuorumSummary } from "@/components/results/QuorumSummary";
import { TieResolutionNote, TieResolutionPanel } from "@/components/results/TieResolutionPanel";
import { PresidentCard } from "@/components/results/PresidentCard";
import { TallyTable } from "@/components/results/TallyTable";
import { VicePresidentPanel } from "@/components/results/VicePresidentPanel";
import { VacancyPanel } from "@/components/results/VacancyPanel";
import { ActaPreview } from "@/components/results/ActaPreview";
import type { CommissionMember, EnrichedTotal, TallyQuorum, TallyView, TieResolution } from "@/components/results/types";

interface ResultsPanelProps {
  status: string;
  role: string;
  totalVotes: number;
  totalEligible: number;
  minParticipationPercentage: number;
  onRefresh: () => void;
}

const OFFICE_ORDER: Record<string, number> = { PRESIDENT: 0, VICE_PRESIDENT: 1, SECRETARY: 2, MEMBER: 3 };

/** Resultados del escrutinio: orquesta las piezas de src/components/results. */
export function ResultsPanel({
  status,
  role,
  totalVotes,
  totalEligible,
  minParticipationPercentage,
  onRefresh,
}: ResultsPanelProps) {
  const [tallyData, setTallyData] = useState<{ quorum: TallyQuorum; tally: TallyView } | null>(null);
  const [commission, setCommission] = useState<CommissionMember[]>([]);
  const [composition, setComposition] = useState<SecretariatComposition | null>(null);
  const [designatedVpId, setDesignatedVpId] = useState("");
  const [tieResolution, setTieResolution] = useState<TieResolution | null>(null);

  const isAuthority = role === "ADMIN" || role === "COMMISSION";
  // Sin quórum o con empate pendiente no hay proclamación.
  const canProclaim = status !== "SIN_QUORUM" && status !== "EMPATE";

  const loadResults = useCallback(async () => {
    try {
      const res = await fetch("/api/eleccion/estado");
      const data = await res.json();
      if (!res.ok) return;
      setComposition(data.composition ?? null);
      setDesignatedVpId(data.designatedVpId ?? "");
      setTieResolution(data.tieResolution ?? null);
      setCommission(
        [...((data.commission ?? []) as CommissionMember[])].sort(
          (a, b) => (OFFICE_ORDER[a.office] ?? 9) - (OFFICE_ORDER[b.office] ?? 9),
        ),
      );

      const t = data.tallyResult;
      const q = data.tallyQuorum;
      if (!t || !q) {
        setTallyData(null);
        return;
      }
      const proclaimed = !["SIN_QUORUM", "EMPATE"].includes(data.summary?.status);
      const presidentId: string | null = t.resolution?.presidentId ?? t.presidentId;
      const byId = new Map<string, { fullName: string; name: string; brigadeCode: string }>(
        (data.candidates ?? []).map((c: { candidateId: string; fullName: string; name: string; brigadeCode: string }) => [
          c.candidateId,
          c,
        ]),
      );
      const totals: EnrichedTotal[] = t.totals.map(
        (x: { candidateId: string; memberVotes: number; presidentVotes: number }) => ({
          ...x,
          fullName: byId.get(x.candidateId)?.fullName ?? x.candidateId,
          brigadeCode: byId.get(x.candidateId)?.brigadeCode ?? "",
          isElected: proclaimed && t.elected.includes(x.candidateId),
          isPresident: proclaimed && presidentId === x.candidateId,
        }),
      );
      const president = proclaimed && presidentId ? (byId.get(presidentId) ?? null) : null;
      setTallyData({ quorum: q, tally: { ...t, presidentId, totals, president } });
    } catch {
      // Se reintenta al volver a la pestaña
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [status, loadResults]);

  const reloadAll = async () => {
    await loadResults();
    onRefresh();
  };

  if (status === "ABIERTA") {
    return (
      <VotingInProgressNotice
        status={status}
        totalVotes={totalVotes}
        totalEligible={totalEligible}
        minParticipationPercentage={minParticipationPercentage}
      />
    );
  }

  if (!tallyData) {
    return isAuthority && status === "CERRADA" ? <RunTallyCard onDone={reloadAll} /> : <NotYetAvailableNotice />;
  }

  const { quorum, tally } = tallyData;
  const eligibleForVp = tally.totals.filter((t) => t.isElected && !t.isPresident);
  const presidentChanged = !!(composition && tally.president && composition.president.candidateId !== tally.presidentId);
  const tie = tally.tie;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <QuorumSummary quorum={quorum} totalEligible={totalEligible} minParticipationPercentage={minParticipationPercentage} />

      {status === "EMPATE" && tie && (
        <TieResolutionPanel tally={{ ...tally, tie }} isAuthority={isAuthority} onResolved={reloadAll} />
      )}

      {tieResolution && <TieResolutionNote resolution={tieResolution} />}

      {tally.president && (
        <PresidentCard elected={tally.president} current={presidentChanged ? composition!.president : null} />
      )}

      <TallyTable totals={tally.totals} canProclaim={canProclaim} />

      {isAuthority && status === "PROCLAMADA" && (
        <VicePresidentPanel
          key={designatedVpId}
          eligible={eligibleForVp}
          designatedVpId={designatedVpId}
          onComposition={setComposition}
          onRefresh={onRefresh}
        />
      )}

      {composition && (
        <VacancyPanel composition={composition} isAuthority={isAuthority} onComposition={setComposition} onRefresh={onRefresh} />
      )}

      {canProclaim && (
        <ActaPreview
          quorum={quorum}
          totalEligible={totalEligible}
          minParticipationPercentage={minParticipationPercentage}
          presidentName={composition?.president?.fullName || tally.president?.fullName || "—"}
          electedPresidentName={presidentChanged ? (tally.president?.fullName ?? null) : null}
          vicePresidentName={composition?.vicePresident?.fullName ?? null}
          electedCount={tally.elected.length}
          tieResolution={tieResolution}
          commission={commission}
        />
      )}
    </div>
  );
}
