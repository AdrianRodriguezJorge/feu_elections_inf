"use client";

import { useEffect, useState, useCallback } from "react";
import { Header, ActiveTab } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VoterBallot, VoterInfo } from "@/components/VoterBallot";
import { AdminPanel } from "@/components/AdminPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ReglamentoViewer } from "@/components/ReglamentoViewer";
import { ObserverPanel } from "@/components/ObserverPanel";
import { LoginCard } from "@/components/LoginCard";
import { AuthUser } from "@/components/AuthModal";
import { ProcessCandidateSnapshot } from "@/domain/candidates";
import { ProcessConfig, DEFAULT_PROCESS_CONFIG } from "@/domain/config";

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
    status: "ABIERTA",
    seats: 9,
    candidatesCount: 11,
    totalEligible: 12,
    totalVotes: 0,
    validBallots: 0,
    annulledBallots: 0,
    participationPct: 0,
    minParticipationPercentage: 85,
    minVotesRequired: 11,
    requirementMet: false,
    candidacyHash: "",
  });
  const [config, setConfig] = useState<ProcessConfig>(DEFAULT_PROCESS_CONFIG);
  const [candidates, setCandidates] = useState<ProcessCandidateSnapshot[]>([]);
  const [electors, setElectors] = useState<VoterInfo[]>([]);
  const [commission, setCommission] = useState<
    Array<{ ci: string; name: string; office: string; brigadeCode: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Carga reactiva de los datos del proceso
  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/eleccion/estado");
      const data = await res.json();
      if (data.ok) {
        setSummary(data.summary);
        setConfig(data.config);
        setCandidates(data.candidates || []);
        setElectors(data.electors || []);
        setCommission(data.commission || []);
      }
    } catch (err) {
      console.error("Error cargando estado electoral:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Consultar sesión activa en el servidor
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/login");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          if (data.user.role === "ADMIN" || data.user.role === "COMMISSION") {
            setActiveTab("ADMIN");
          } else if (data.user.role === "OBSERVER") {
            setActiveTab("OBSERVADOR");
          } else {
            setActiveTab("VOTACION");
          }
        }
      } catch {
        // Sin sesión previa
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === "ADMIN" || user.role === "COMMISSION") {
      setActiveTab("ADMIN");
    } else if (user.role === "OBSERVER") {
      setActiveTab("OBSERVADOR");
    } else {
      setActiveTab("VOTACION");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
    } catch {
      // Ignorar
    }
    setCurrentUser(null);
    setActiveTab("VOTACION");
  };

  const isAdminOrCommission =
    currentUser?.role === "ADMIN" || currentUser?.role === "COMMISSION";

  // PANTALLA INICIAL: Cuando no está autenticado, el login es solo login y sin scroll a 100%
  if (!currentUser) {
    return (
      <div className="h-screen h-[100dvh] flex flex-col bg-feu-green-50/40 text-feu-green-900 overflow-hidden">
        <main className="flex-1 flex items-center justify-center px-4 py-2 min-h-0">
          {isLoading ? (
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#136D54] border-r-transparent" />
              <p className="mt-2 text-xs text-gray-500">Cargando portal institucional...</p>
            </div>
          ) : (
            <LoginCard onLoginSuccess={handleLoginSuccess} />
          )}
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
            electors={electors}
            selectedVoterCi={currentUser.ci}
            onSelectVoter={() => {}}
            onVoteCast={loadState}
            currentUser={currentUser}
          />
        )}

        {activeTab === "ADMIN" && isAdminOrCommission && (
          <AdminPanel
            summary={summary}
            config={config}
            candidates={candidates}
            commission={commission}
            onRefresh={loadState}
          />
        )}

        {activeTab === "RESULTADOS" && (
          <ResultsPanel
            status={summary.status}
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
            electors={electors}
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
