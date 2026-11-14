"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Header, ActiveTab } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VoterBallot, VoterInfo } from "@/components/VoterBallot";
import { AdminPanel, QuorumInfo } from "@/components/AdminPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ReglamentoViewer } from "@/components/ReglamentoViewer";
import { ObserverPanel } from "@/components/ObserverPanel";
import { LoginCard } from "@/components/LoginCard";
import type { SessionUser } from "@/lib/session-user";
import { ProcessCandidateSnapshot } from "@/domain/candidates";

interface ProcessSummary {
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("VOTACION");
  const [summary, setSummary] = useState<ProcessSummary>({
    status: "",
    seats: 0,
    candidatesCount: 0,
    totalEligible: 0,
    totalVotes: 0,
    validBallots: 0,
    annulledBallots: 0,
    participationPct: 0,
    minParticipationPercentage: 85,
    minVotesRequired: 0,
    requirementMet: false,
    candidacyHash: "",
  });
  const [quorum, setQuorum] = useState<QuorumInfo>({ basePct: 85, effectivePct: 85, exception: null });
  const [candidates, setCandidates] = useState<ProcessCandidateSnapshot[]>([]);
  const [me, setMe] = useState<VoterInfo | null>(null);
  const [brigadeTurnout, setBrigadeTurnout] = useState<Array<{ code: string; total: number; voted: number }>>([]);
  const [commission, setCommission] = useState<
    Array<{ ci: string; name: string; office: string; brigadeCode: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  // Carga reactiva de los datos del proceso
  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/eleccion/estado");
      const data = await res.json();
      if (data.ok) {
        setSummary(data.summary);
        if (data.quorum) setQuorum(data.quorum);
        setCandidates(data.candidates || []);
        setMe(data.me ?? null);
        setBrigadeTurnout(data.brigadeTurnout ?? []);
        setCommission(data.commission || []);
      }
    } catch {
      // Se reintenta en la próxima acción del usuario
    }
  }, []);

  const landingTab = (role: SessionUser["role"]): ActiveTab =>
    role === "ADMIN" || role === "COMMISSION" ? "ADMIN" : role === "OBSERVER" ? "OBSERVADOR" : "VOTACION";

  // La sesión la emite el servidor (cookie cifrada de Auth.js); aquí solo se lee.
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      const user = data?.user as SessionUser | undefined;
      if (user?.ci && user.role) {
        setCurrentUser(user);
        setActiveTab(landingTab(user.role));
        await loadState();
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadState]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // La cookie caduca sola a las 8 horas
    }
    setCurrentUser(null);
    setMe(null);
    setActiveTab("VOTACION");
  };

  const isAdminOrCommission =
    currentUser?.role === "ADMIN" || currentUser?.role === "COMMISSION";

  // PANTALLA INICIAL: Cuando no está autenticado, el login es solo login y sin scroll a 100%
  if (!currentUser) {
    return (
      <div className="h-screen h-[100dvh] flex flex-col bg-feu-green-50/40 text-feu-green-900 overflow-hidden">
        {/* Sin scroll en el login; solo aparece si el formulario no cabe (p. ej. activación en pantallas bajas). */}
        <main className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-2 min-h-0">
          <div className="my-auto w-full flex justify-center">
          {isLoading ? (
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#136D54] border-r-transparent" />
              <p className="mt-2 text-xs text-gray-500">Cargando portal institucional...</p>
            </div>
          ) : (
            <LoginCard onLoginSuccess={refreshSession} />
          )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // PANTALLA PRINCIPAL: Autenticado con navegación según rol
  return (
    <div className="min-h-screen flex flex-col bg-feu-green-50/40 text-feu-green-900">
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === "ADMIN" && !isAdminOrCommission) {
            return;
          }
          setActiveTab(tab);
        }}
        status={summary.status}
        totalVotes={summary.totalVotes}
        totalEligible={summary.totalEligible}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
        {activeTab === "VOTACION" && (
          <VoterBallot
            candidates={candidates}
            seats={summary.seats}
            me={me}
            onVoteCast={loadState}
            currentUser={currentUser}
            status={summary.status}
          />
        )}

        {activeTab === "ADMIN" && isAdminOrCommission && (
          <AdminPanel
            summary={summary}
            quorum={quorum}
            role={currentUser.role}
            candidates={candidates}
            commission={commission}
            onRefresh={loadState}
          />
        )}

        {activeTab === "RESULTADOS" && (
          <ResultsPanel
            status={summary.status}
            role={currentUser.role}
            totalVotes={summary.totalVotes}
            totalEligible={summary.totalEligible}
            minParticipationPercentage={summary.minParticipationPercentage}
            onRefresh={loadState}
          />
        )}

        {activeTab === "REGLAMENTO" && <ReglamentoViewer />}

        {activeTab === "OBSERVADOR" && (currentUser?.role === "OBSERVER" || isAdminOrCommission) && (
          <ObserverPanel
            status={summary.status}
            totalVotes={summary.totalVotes}
            totalEligible={summary.totalEligible}
            validBallots={summary.validBallots}
            annulledBallots={summary.annulledBallots}
            participationPct={summary.participationPct}
            minParticipationPercentage={summary.minParticipationPercentage}
            minVotesRequired={summary.minVotesRequired}
            requirementMet={summary.requirementMet}
            candidacyHash={summary.candidacyHash}
            brigadeTurnout={brigadeTurnout}
            candidatesCount={summary.candidatesCount}
            seats={summary.seats}
            onRefresh={loadState}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
