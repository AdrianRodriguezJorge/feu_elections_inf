import { createHash } from "node:crypto";
import { canonicalJsonStringify } from "@/domain/audit";
import type { ElectionView } from "@/server/election-service";
import type { ActaData } from "@/utils/pdfActa";
import { officeLabel } from "@/lib/status-labels";

/** Huella SHA-256 del resultado (JSON canónico de {tallyResult, quorum}). */
export function resultFingerprint(view: ElectionView): string {
  return createHash("sha256")
    .update(canonicalJsonStringify({ tallyResult: view.tallyResult, quorum: view.quorum }))
    .digest("hex");
}

const OFFICE_ORDER: Record<string, number> = { PRESIDENT: 0, VICE_PRESIDENT: 1, SECRETARY: 2, MEMBER: 3 };

/** Reúne los datos del acta a partir de la vista de la elección (requiere tallyResult y quorum). */
export function buildActaData(view: ElectionView): ActaData {
  const tally = view.tallyResult!;
  const quorum = view.quorum!;
  const byId = new Map(view.candidates.map((c) => [c.candidateId, c]));
  const nameOf = (id: string | null | undefined) => (id ? (byId.get(id)?.fullName ?? "—") : "—");
  const presidentId = tally.resolution?.presidentId ?? tally.presidentId;
  const comp = view.composition;
  const currentPresidentId = comp?.president.candidateId ?? presidentId;

  const rows = tally.totals.map((t) => {
    const c = byId.get(t.candidateId);
    return {
      fullName: c?.fullName ?? t.candidateId,
      brigadeCode: c?.brigadeCode ?? "",
      memberVotes: t.memberVotes,
      presidentVotes: t.presidentVotes,
      condition: t.candidateId === presidentId ? "Presidente electo" : tally.elected.includes(t.candidateId) ? "Electo" : "No electo",
    };
  });

  const tieSentence = view.tieResolution
    ? `El empate fue resuelto por la Comisión Electoral (acta ${view.tieResolution.acta}): ${view.tieResolution.justification.trim().replace(/\.+$/, "")}.`
    : null;

  return {
    totalEligible: view.electors.size,
    participations: quorum.participations,
    participationPct: quorum.participationPct,
    quorumMet: quorum.quorumMet,
    effectiveQuorumPct: view.quorumPct,
    quorumException: view.quorumException ? { pct: view.quorumPct, acta: view.quorumException.acta } : null,
    rows,
    presidentName: comp ? comp.president.fullName : nameOf(presidentId),
    electedPresidentName: comp && currentPresidentId !== presidentId ? nameOf(presidentId) : null,
    vicePresidentName: comp?.vicePresident?.fullName ?? null,
    tieSentence,
    signatures: [...view.commission]
      .sort((a, b) => (OFFICE_ORDER[a.office] ?? 9) - (OFFICE_ORDER[b.office] ?? 9))
      .map((m) => ({ name: m.name, office: `${officeLabel(m.office)} de la Comisión Electoral` })),
    resultHash: resultFingerprint(view),
    issuedAt: new Date(),
  };
}
