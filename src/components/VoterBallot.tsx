"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import type { ProcessCandidateSnapshot } from "@/domain/candidates";
import type { BallotSelection } from "@/domain/types";
import type { SessionUser } from "@/lib/session-user";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { BiographyModal } from "./BiographyModal";
import { BallotMessage, BallotStatusScreen } from "./ballot/BallotStatusScreen";
import { BallotHeader } from "./ballot/BallotHeader";
import { BallotTable } from "./ballot/BallotTable";
import { BallotCards } from "./ballot/BallotCards";
import { AnnulDialog, ReviewDialog } from "./ballot/BallotDialogs";
import { VoteReceipt } from "./ballot/VoteReceipt";
import { surnameFirst, type VoterInfo } from "./ballot/shared";

export type { VoterInfo };

interface VoterBallotProps {
  candidates: ProcessCandidateSnapshot[];
  seats: number;
  me: VoterInfo | null;
  onVoteCast: () => void;
  currentUser: SessionUser;
  status?: string;
}

export function VoterBallot({ candidates, seats, me, onVoteCast, currentUser, status }: VoterBallotProps) {
  const [memberMarks, setMemberMarks] = useState<Set<string>>(new Set());
  const [presidentMark, setPresidentMark] = useState<string | null>(null);
  const [bioCandidate, setBioCandidate] = useState<ProcessCandidateSnapshot | null>(null);
  const [showAnnul, setShowAnnul] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ receiptHash: string; ballotStatus: string } | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const toggleMember = (id: string) => {
    setInlineError(null);
    const updated = new Set(memberMarks);
    if (updated.has(id)) {
      updated.delete(id);
      if (presidentMark === id) setPresidentMark(null);
    } else {
      if (updated.size >= seats) {
        setInlineError(`Solo puede marcar hasta ${seats} miembros. Desmarque a otro candidato para elegir este.`);
        return;
      }
      updated.add(id);
    }
    setMemberMarks(updated);
  };

  const selectPresident = (id: string) => {
    setInlineError(null);
    if (!memberMarks.has(id)) {
      if (memberMarks.size >= seats) {
        setInlineError(`Para elegir a este candidato como Presidente, primero desmarque a otro miembro (máximo ${seats}).`);
        return;
      }
      setMemberMarks(new Set(memberMarks).add(id));
    }
    setPresidentMark(id);
  };

  const handleReview = () => {
    setInlineError(null);
    if (memberMarks.size === 0) return setInlineError("Marque al menos un miembro para emitir un voto válido.");
    if (!presidentMark) return setInlineError("Marque un Presidente entre los candidatos que eligió como miembro.");
    setShowReview(true);
  };

  const submitBallot = async (body: { selections: BallotSelection[]; isAnnulled: boolean }, failMsg: string) => {
    setInlineError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/voto/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setInlineError(data.error || failMsg);
        return;
      }
      setSubmitResult({ receiptHash: data.receiptHash, ballotStatus: data.ballotStatus });
      onVoteCast();
    } catch {
      setInlineError("No se pudo conectar con el servidor. Revise su conexión e inténtelo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmValid = async () => {
    setShowReview(false);
    const selections: BallotSelection[] = candidates.map((c) => ({
      processCandidateId: c.candidateId,
      member: memberMarks.has(c.candidateId),
      president: presidentMark === c.candidateId,
    }));
    await submitBallot({ selections, isAnnulled: false }, "No se pudo emitir el voto. Inténtelo de nuevo.");
  };

  const confirmAnnul = async () => {
    setShowAnnul(false);
    await submitBallot({ selections: [], isAnnulled: true }, "No se pudo anular la boleta. Inténtelo de nuevo.");
  };

  if (status && status !== "ABIERTA") return <BallotStatusScreen status={status} />;

  if (!me && !submitResult) {
    return (
      <BallotMessage
        title="No figura en el registro de electores"
        body="Su cuenta no está asociada a ningún elector habilitado. Si cree que es un error, contacte a la Comisión Electoral."
      />
    );
  }

  const voterName = me?.name ?? currentUser.name;

  if (submitResult || me?.hasVoted) {
    return (
      <VoteReceipt
        receiptHash={submitResult?.receiptHash ?? null}
        annulled={submitResult?.ballotStatus === "ANULADA_POR_ELECTOR"}
        voterName={voterName}
        brigadeCode={me?.brigadeCode}
      />
    );
  }

  const president = candidates.find((c) => c.candidateId === presidentMark);
  const presidentName = president ? surnameFirst(president) : null;
  const marksProps = {
    candidates,
    seats,
    memberMarks,
    presidentMark,
    onToggleMember: toggleMember,
    onSelectPresident: selectPresident,
    onShowBio: setBioCandidate,
  };

  return (
    <div className="mx-auto max-w-4xl pb-28 md:pb-8">
      <div className="rounded-md border border-line bg-white px-4 py-6 sm:px-8 sm:py-8">
        <BallotHeader
          voterName={voterName}
          brigadeCode={me?.brigadeCode}
          canVote={me?.hasVoted === false}
          seats={seats}
          memberCount={memberMarks.size}
          presidentName={presidentName}
        />

        <div aria-live="assertive">
          {inlineError && (
            <Alert tone="danger" role="alert" className="mt-4 flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              <span>{inlineError}</span>
            </Alert>
          )}
        </div>

        <div className="mt-6">
          <BallotTable {...marksProps} />
          <BallotCards {...marksProps} />
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => setShowAnnul(true)} disabled={isSubmitting}>
            Anular mi boleta
          </Button>
          <Button
            variant="primary"
            className="hidden px-6 md:inline-flex"
            onClick={handleReview}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registrando su voto..." : "Revisar y votar"}
          </Button>
        </div>
      </div>

      {/* Barra inferior fija (móvil) */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line-strong bg-white px-4 py-2 md:hidden">
        <div className="min-w-0 text-sm">
          <span className="block truncate text-ink-700">
            {memberMarks.size} de {seats} miembros
          </span>
          <span className="block truncate font-semibold text-ink-900">
            {presidentName ? `Presidente: ${presidentName}` : "Sin presidente"}
          </span>
        </div>
        <Button
          variant="primary"
          className="shrink-0"
          onClick={handleReview}
          disabled={isSubmitting}
        >
          Revisar y votar
        </Button>
      </div>

      <BiographyModal candidate={bioCandidate} onClose={() => setBioCandidate(null)} />
      <ReviewDialog
        open={showReview}
        onOpenChange={setShowReview}
        onConfirm={confirmValid}
        disabled={isSubmitting}
        president={president}
        members={candidates.filter((c) => memberMarks.has(c.candidateId))}
        seats={seats}
      />
      <AnnulDialog open={showAnnul} onOpenChange={setShowAnnul} onConfirm={confirmAnnul} disabled={isSubmitting} />
    </div>
  );
}
