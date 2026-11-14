"use client";

import * as React from "react";
import type { ProcessCandidateSnapshot } from "@/domain/candidates";
import type { SessionUser } from "@/lib/session-user";

/** Resumen numérico del proceso (GET /api/eleccion/estado → summary). */
export interface ProcessSummary {
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
}

export interface QuorumInfo {
  basePct: number;
  effectivePct: number;
  exception: { pct: number; justification: string; acta: string; appliedBy: string; appliedAt: string } | null;
}

export interface ElectionData {
  summary: ProcessSummary;
  quorum: QuorumInfo;
  candidates: ProcessCandidateSnapshot[];
  me: { name: string; brigadeCode: string; hasVoted: boolean } | null;
  brigadeTurnout: Array<{ code: string; total: number; voted: number }>;
  commission: Array<{ ci: string; name: string; office: string; brigadeCode: string }>;
}

interface ElectionContextValue {
  user: SessionUser;
  data: ElectionData | null;
  error: string | null;
  reload: () => Promise<void>;
}

const ElectionContext = React.createContext<ElectionContextValue | null>(null);

/**
 * Datos de la elección compartidos por todas las páginas autenticadas.
 * La sesión la valida el servidor (layout); aquí solo se carga el estado.
 */
export function ElectionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [data, setData] = React.useState<ElectionData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      const res = await fetch("/api/eleccion/estado", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? "No se pudo cargar el estado de la elección.");
        return;
      }
      setError(null);
      setData({
        summary: body.summary,
        quorum: body.quorum,
        candidates: body.candidates ?? [],
        me: body.me ?? null,
        brigadeTurnout: body.brigadeTurnout ?? [],
        commission: body.commission ?? [],
      });
    } catch {
      setError("No se pudo conectar con el servidor. Inténtelo de nuevo.");
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return <ElectionContext.Provider value={{ user, data, error, reload }}>{children}</ElectionContext.Provider>;
}

export function useElection(): ElectionContextValue {
  const ctx = React.useContext(ElectionContext);
  if (!ctx) throw new Error("useElection debe usarse dentro de <ElectionProvider>.");
  return ctx;
}
