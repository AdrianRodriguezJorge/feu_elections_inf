"use client";

import { useState } from "react";
import {
  Clipboard,
  Check,
  Search,
  AlertCircle,
  AlertTriangle,
  Vote,
  Star,
  Plus,
  Clock,
  Lock,
  Scale,
  Ban,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { ProcessCandidateSnapshot } from "@/domain/candidates";
import { BallotSelection } from "@/domain/types";
import { BiographyModal } from "./BiographyModal";
import { ReceiptVerifierModal } from "./ReceiptVerifierModal";
import type { SessionUser } from "@/lib/session-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Ficha del elector autenticado (la devuelve el servidor desde la sesión). */
export interface VoterInfo {
  name: string;
  brigadeCode: string;
  hasVoted: boolean;
}

interface VoterBallotProps {
  candidates: ProcessCandidateSnapshot[];
  seats: number;
  me: VoterInfo | null;
  onVoteCast: () => void;
  currentUser: SessionUser;
  status?: string;
}

/** Nombre en el orden de la columna "Apellidos y nombres". */
function surnameFirst(c: ProcessCandidateSnapshot): string {
  const surnames = [c.firstSurname, c.secondSurname].filter(Boolean).join(" ");
  return surnames ? `${surnames}, ${c.name}` : c.fullName;
}

interface StatusScreen {
  icon: LucideIcon;
  title: string;
  body: string;
}

function statusScreen(status: string): StatusScreen {
  switch (status) {
    case "CONVOCADO":
      return {
        icon: Clock,
        title: "La votación aún no ha comenzado",
        body: "La Comisión Electoral abrirá la votación cuando inicie la jornada electoral. Vuelva a esta página entonces.",
      };
    case "CERRADA":
      return {
        icon: Lock,
        title: "La votación ha cerrado",
        body: "La Comisión Electoral realizará el escrutinio. Los resultados se publicarán aquí.",
      };
    case "SIN_QUORUM":
      return {
        icon: Ban,
        title: "Elección no válida",
        body: "La participación no superó el mínimo requerido por el Reglamento (Art. 38), por lo que no se proclama a ningún candidato. La Comisión Electoral informará los próximos pasos.",
      };
    case "EMPATE":
      return {
        icon: Scale,
        title: "Resultados pendientes",
        body: "La Comisión Electoral está resolviendo un empate según el Reglamento. Los resultados se publicarán cuando concluya.",
      };
    case "PROCLAMADA":
    case "VP_DESIGNADA":
    case "FINALIZADA":
    case "VACANTE":
      return { icon: BarChart3, title: "Resultados publicados", body: "Consulte la pestaña Resultados." };
    default:
      return {
        icon: Clock,
        title: "La votación no está disponible",
        body: "En este momento no se puede votar. Consulte a la Comisión Electoral.",
      };
  }
}

export function VoterBallot({ candidates, seats, me, onVoteCast, currentUser, status }: VoterBallotProps) {
  const [memberMarks, setMemberMarks] = useState<Set<string>>(new Set());
  const [presidentMark, setPresidentMark] = useState<string | null>(null);

  const [bioCandidate, setBioCandidate] = useState<ProcessCandidateSnapshot | null>(null);
  const [showAnnulModal, setShowAnnulModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [verifyReceiptHash, setVerifyReceiptHash] = useState<string | null>(null);
  const [searchReceiptInput, setSearchReceiptInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchBox, setShowSearchBox] = useState(false);

  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ receiptHash: string; ballotStatus: string } | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const currentVoter = me;

  const handleCopyReceipt = async (text: string) => {
    setCopyError(false);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    } catch {
      setCopiedReceipt(false);
      setCopyError(true);
    }
  };

  const toggleMember = (candidateId: string) => {
    setInlineError(null);
    const updated = new Set(memberMarks);
    if (updated.has(candidateId)) {
      updated.delete(candidateId);
      if (presidentMark === candidateId) setPresidentMark(null);
    } else {
      if (updated.size >= seats) {
        setInlineError(`Solo puede marcar hasta ${seats} miembros. Desmarque a otro candidato para elegir este.`);
        return;
      }
      updated.add(candidateId);
    }
    setMemberMarks(updated);
  };

  const handleSelectPresident = (candidateId: string) => {
    setInlineError(null);
    const updatedMembers = new Set(memberMarks);
    if (!updatedMembers.has(candidateId)) {
      if (updatedMembers.size >= seats) {
        setInlineError(
          `Para elegir a este candidato como Presidente, primero desmarque a otro miembro (máximo ${seats}).`,
        );
        return;
      }
      updatedMembers.add(candidateId);
      setMemberMarks(updatedMembers);
    }
    setPresidentMark(candidateId);
  };

  /** Valida la boleta y abre el paso de revisión. */
  const handleReview = () => {
    setInlineError(null);
    if (memberMarks.size === 0) {
      setInlineError("Marque al menos un miembro para emitir un voto válido.");
      return;
    }
    if (!presidentMark) {
      setInlineError("Marque un Presidente entre los candidatos que eligió como miembro.");
      return;
    }
    if (!memberMarks.has(presidentMark)) {
      setInlineError("El candidato elegido como Presidente también debe estar marcado como miembro.");
      return;
    }
    setShowReviewModal(true);
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

  const handleConfirmValid = async () => {
    setShowReviewModal(false);
    const selections: BallotSelection[] = candidates.map((c) => ({
      processCandidateId: c.candidateId,
      member: memberMarks.has(c.candidateId),
      president: presidentMark === c.candidateId,
    }));
    await submitBallot({ selections, isAnnulled: false }, "No se pudo emitir el voto. Inténtelo de nuevo.");
  };

  const handleConfirmAnnulment = async () => {
    setShowAnnulModal(false);
    await submitBallot({ selections: [], isAnnulled: true }, "No se pudo anular la boleta. Inténtelo de nuevo.");
  };

  // Votación no abierta
  if (status && status !== "ABIERTA") {
    const screen = statusScreen(status);
    const Icon = screen.icon;
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-700">
          <Icon className="h-10 w-10" strokeWidth={2} aria-hidden />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{screen.title}</h2>
        <p className="mt-2 text-sm text-gray-700 max-w-md mx-auto leading-relaxed">{screen.body}</p>
      </div>
    );
  }

  if (!currentVoter && !submitResult) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <h2 className="text-xl font-bold text-gray-900">No figura en el registro de electores</h2>
        <p className="mt-2 text-sm text-gray-700">
          Su cuenta no está asociada a ningún elector habilitado. Si cree que es un error, contacte a la Comisión
          Electoral.
        </p>
      </div>
    );
  }

  // Ya votó o acaba de votar
  if (submitResult || (currentVoter && currentVoter.hasVoted)) {
    const hash = submitResult?.receiptHash;
    const annulled = submitResult?.ballotStatus === "ANULADA_POR_ELECTOR";
    const title = !submitResult ? "Ya votó" : annulled ? "Boleta anulada registrada" : "Voto registrado";

    return (
      <div
        className={cn(
          "mx-auto max-w-2xl rounded-2xl border bg-white p-6 sm:p-10 text-center shadow-lg",
          annulled ? "border-amber-200" : "border-emerald-200",
        )}
      >
        <div
          className={cn(
            "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full",
            annulled ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700",
          )}
        >
          {annulled ? (
            <Ban className="h-10 w-10" strokeWidth={2} aria-hidden />
          ) : (
            <Check className="h-10 w-10" strokeWidth={2.5} aria-hidden />
          )}
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h2>

        <p className="mt-2 text-sm text-gray-700">
          Elector: <strong className="text-gray-900">{currentVoter?.name || currentUser.name}</strong>
          {currentVoter?.brigadeCode && (
            <>
              {" "}· Brigada: <span className="font-semibold">{currentVoter.brigadeCode}</span>
            </>
          )}
        </p>

        {annulled && (
          <p className="mt-3 text-sm text-gray-700">
            Su boleta anulada cuenta para la participación, pero no suma votos a ningún candidato.
          </p>
        )}

        {!hash && (
          <p className="mt-4 text-sm text-gray-700">
            Su participación ya está registrada. Si guardó su comprobante, puede verificar que su boleta está en la
            urna.
          </p>
        )}

        {hash && (
          <div className="my-6 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 text-left">
            <div className="border-b border-gray-200 pb-2 mb-2">
              <span className="text-sm font-bold text-gray-900">Su comprobante</span>
            </div>

            <div className="rounded-lg bg-white p-3 border border-gray-200 font-mono text-xs sm:text-sm text-gray-800 break-all select-all">
              {hash}
            </div>

            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="primary"
                  className="w-full sm:w-auto"
                  aria-label="Copiar comprobante"
                  onClick={() => handleCopyReceipt(hash)}
                >
                  {copiedReceipt ? (
                    <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
                  ) : (
                    <Clipboard className="h-4 w-4" strokeWidth={2} aria-hidden />
                  )}
                  <span>{copiedReceipt ? "Comprobante copiado" : "Copiar comprobante"}</span>
                </Button>

                <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setVerifyReceiptHash(hash)}>
                  <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
                  <span>Verificar comprobante</span>
                </Button>
              </div>

              <span className="text-xs text-gray-600 text-center sm:text-right">
                Guárdelo: es la única forma de comprobar que su boleta está en la urna.
              </span>
            </div>
            <p aria-live="polite" className="mt-2 text-xs text-gray-700">
              {copiedReceipt ? "Comprobante copiado al portapapeles." : ""}
              {copyError ? "No se pudo copiar. Seleccione el comprobante y cópielo manualmente." : ""}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-600 leading-relaxed max-w-lg mx-auto">
          Su voto es secreto: la boleta se guardó en la urna sin ningún dato que le identifique.
        </p>

        {verifyReceiptHash && (
          <ReceiptVerifierModal receiptHash={verifyReceiptHash} onClose={() => setVerifyReceiptHash(null)} />
        )}
      </div>
    );
  }

  // Elector listo para votar
  const presidentCandidate = candidates.find((c) => c.candidateId === presidentMark);
  const reviewMembers = candidates.filter((c) => memberMarks.has(c.candidateId));

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6 pb-24 md:pb-8">
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-gray-600">Elector</p>
            <p className="text-sm font-bold text-gray-900">{currentVoter?.name ?? currentUser.name}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700 font-medium">
              Brigada: <strong className="text-gray-900">{currentVoter?.brigadeCode ?? "—"}</strong>
            </span>
            {currentVoter && currentVoter.hasVoted === false && (
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                <span>Puede votar</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Verificación por comprobante */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          className="text-sm underline"
          aria-expanded={showSearchBox}
          onClick={() => setShowSearchBox(!showSearchBox)}
        >
          <Search className="h-4 w-4 text-gray-600" strokeWidth={2} aria-hidden />
          <span>{showSearchBox ? "Ocultar verificación" : "¿Tiene un comprobante? Verifíquelo"}</span>
        </Button>
      </div>

      {showSearchBox && (
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              value={searchReceiptInput}
              onChange={(e) => {
                setSearchReceiptInput(e.target.value);
                setSearchError(null);
              }}
              placeholder="Pegue aquí su comprobante"
              aria-label="Comprobante"
              aria-invalid={!!searchError}
              aria-describedby={searchError ? "receipt-search-error" : undefined}
              className="flex-1 font-mono text-xs"
            />
            <Button
              variant="primary"
              onClick={() => {
                if (searchReceiptInput.trim()) setVerifyReceiptHash(searchReceiptInput.trim());
                else setSearchError("Pegue su comprobante en el campo antes de verificar.");
              }}
            >
              Verificar
            </Button>
          </div>
          {searchError && (
            <p id="receipt-search-error" role="alert" className="mt-2 text-xs font-medium text-red-700">
              {searchError}
            </p>
          )}
        </div>
      )}

      {/* Instrucciones y contador */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Boleta oficial · Elección del Secretariado</h2>
            <ul className="mt-1 list-disc pl-4 text-sm text-gray-700 space-y-0.5">
              <li>
                Marque <strong>hasta {seats} miembros</strong> para el Secretariado.
              </li>
              <li>
                Marque <strong>1 Presidente</strong> entre los candidatos que eligió como miembro.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-around sm:justify-end gap-3 rounded-lg bg-gray-50 p-2.5 sm:p-3 border border-gray-100">
            <div className="text-center sm:text-right">
              <span className="block text-xs text-gray-600 font-medium">Miembros marcados</span>
              <span className="text-base sm:text-lg font-bold text-gray-900">
                {memberMarks.size} <span className="text-xs font-normal text-gray-600">/ {seats}</span>
              </span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center sm:text-left min-w-[100px]">
              <span className="block text-xs text-gray-600 font-medium">Presidente</span>
              <span className="text-xs sm:text-sm font-bold text-amber-900 truncate block max-w-[160px]">
                {presidentCandidate ? surnameFirst(presidentCandidate) : "Pendiente"}
              </span>
            </div>
          </div>
        </div>

        <div aria-live="assertive">
          {inlineError && (
            <div
              role="alert"
              className="mt-3 rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700 flex items-center gap-1.5"
            >
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={2} aria-hidden />
              <span>{inlineError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 text-center w-12">#</th>
              <th scope="col" className="px-4 py-3">Apellidos y nombres</th>
              <th scope="col" className="px-4 py-3 text-center w-24">Brigada</th>
              <th scope="col" className="px-4 py-3 text-center w-32">
                Miembro
                <span className="block text-xs font-normal normal-case text-gray-600">(hasta {seats})</span>
              </th>
              <th scope="col" className="px-4 py-3 text-center w-32">
                Presidente
                <span className="block text-xs font-normal normal-case text-gray-600">(solo 1)</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-900">
            {candidates.map((candidate) => {
              const isMember = memberMarks.has(candidate.candidateId);
              const isPresident = presidentMark === candidate.candidateId;
              const displayName = surnameFirst(candidate);
              return (
                <tr
                  key={candidate.candidateId}
                  className={cn(
                    "transition-colors",
                    isPresident ? "bg-amber-50/70" : isMember ? "bg-emerald-50/40" : "hover:bg-gray-50",
                  )}
                >
                  <td className="px-4 py-3 text-center font-bold text-gray-600">{candidate.ballotPosition}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{displayName}</div>
                    <button
                      type="button"
                      onClick={() => setBioCandidate(candidate)}
                      className="min-h-11 text-sm text-cujae-green-700 underline-offset-2 hover:underline"
                      aria-label={`Leer biografía y propuestas de ${displayName}`}
                    >
                      Leer biografía y propuestas
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-medium text-gray-700">
                    {candidate.brigadeCode}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isMember}
                        onChange={() => toggleMember(candidate.candidateId)}
                        aria-label={`Miembro: ${displayName}`}
                        className="h-5 w-5 rounded border-gray-300 accent-cujae-green-500"
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center">
                      <input
                        type="radio"
                        name="desktopPresidentSelection"
                        checked={isPresident}
                        onChange={() => handleSelectPresident(candidate.candidateId)}
                        aria-label={`Presidente: ${displayName}`}
                        className="h-5 w-5 accent-amber-600"
                      />
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas */}
      <div className="block md:hidden space-y-3">
        <p className="text-xs font-semibold text-gray-600 px-1">Candidatos en el orden de la boleta:</p>
        {candidates.map((candidate) => {
          const isMember = memberMarks.has(candidate.candidateId);
          const isPresident = presidentMark === candidate.candidateId;
          const displayName = surnameFirst(candidate);
          return (
            <div
              key={candidate.candidateId}
              className={cn(
                "rounded-xl border p-3.5 transition-all shadow-xs",
                isPresident
                  ? "border-amber-300 bg-amber-50/50"
                  : isMember
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-gray-200 bg-white",
              )}
            >
              <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                    {candidate.ballotPosition}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{displayName}</h3>
                    <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700 mt-0.5">
                      Brigada {candidate.brigadeCode}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBioCandidate(candidate)}
                  aria-label={`Propuestas de ${displayName}`}
                  className="shrink-0 min-h-11 text-xs font-semibold text-cujae-green-700 bg-emerald-50 px-3 rounded-lg hover:bg-emerald-100"
                >
                  Propuestas
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={isMember}
                  aria-label={`Miembro: ${displayName}`}
                  onClick={() => toggleMember(candidate.candidateId)}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-sm font-bold transition",
                    isMember
                      ? "border-cujae-green-500 bg-cujae-green-500 text-white shadow-xs"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100",
                  )}
                >
                  {isMember ? (
                    <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  )}
                  {/* El estado lo anuncia aria-pressed; el texto visible forma parte del nombre (WCAG 2.5.3). */}
                  <span>Miembro</span>
                </button>

                <button
                  type="button"
                  aria-pressed={isPresident}
                  aria-label={`Presidente: ${displayName}`}
                  onClick={() => handleSelectPresident(candidate.candidateId)}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-sm font-bold transition",
                    isPresident
                      ? "border-amber-700 bg-amber-700 text-white shadow-xs"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-amber-50 active:bg-amber-100",
                  )}
                >
                  <Star
                    className={cn("h-4 w-4", isPresident ? "fill-white text-white" : "text-gray-500")}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>Presidente</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Acciones (escritorio) */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => setShowAnnulModal(true)}
          disabled={isSubmitting}
        >
          Anular mi boleta
        </Button>

        <Button
          variant="primary"
          className="hidden md:inline-flex w-full sm:w-auto px-6"
          onClick={handleReview}
          disabled={isSubmitting}
          aria-label="Revisar y votar"
        >
          <Vote className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span>{isSubmitting ? "Registrando su voto..." : "Revisar y votar"}</span>
        </Button>
      </div>

      {/* Barra inferior fija (móvil) */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-2 shadow-lg flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-xs text-gray-600 font-medium truncate">
            {memberMarks.size} de {seats} miembros
          </span>
          <span className="block text-xs font-bold text-amber-900 truncate">
            {presidentCandidate ? `Presidente: ${surnameFirst(presidentCandidate)}` : "Sin presidente"}
          </span>
        </div>
        <Button
          variant="primary"
          className="shrink-0"
          onClick={handleReview}
          disabled={isSubmitting}
          aria-label="Revisar y votar"
        >
          <Vote className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span>Revisar y votar</span>
        </Button>
      </div>

      <BiographyModal candidate={bioCandidate} onClose={() => setBioCandidate(null)} />

      {/* Revisión del voto */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revise su voto</DialogTitle>
            <DialogDescription>
              Compruebe su selección. Una vez confirmado, el voto no se puede cambiar.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 text-sm text-gray-900">
            <p>
              <span className="font-semibold">Presidente:</span>{" "}
              {presidentCandidate ? surnameFirst(presidentCandidate) : "—"}
            </p>
            <div>
              <p className="font-semibold">
                Miembros ({reviewMembers.length} de {seats}):
              </p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {reviewMembers.map((c) => (
                  <li key={c.candidateId}>{surnameFirst(c)}</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Volver a la boleta</Button>
            </DialogClose>
            <Button variant="primary" onClick={handleConfirmValid} disabled={isSubmitting}>
              Confirmar voto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anulación consciente */}
      <Dialog open={showAnnulModal} onOpenChange={setShowAnnulModal}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <AlertTriangle className="h-6 w-6" strokeWidth={2} aria-hidden />
            </div>
            <DialogTitle>¿Desea anular su boleta?</DialogTitle>
            <DialogDescription>
              En las elecciones de la FEU no existe el voto en blanco. Si decide no apoyar a ningún candidato, su
              boleta se registrará como <strong>anulada por el elector</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 leading-normal">
            <strong>Importante:</strong> su boleta contará para la participación mínima requerida, pero{" "}
            <strong>no sumará votos</strong> a ningún candidato. Esta acción no se puede deshacer y consume su voto.
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Volver a la boleta</Button>
            </DialogClose>
            <Button variant="danger" onClick={handleConfirmAnnulment} disabled={isSubmitting}>
              Sí, anular boleta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {verifyReceiptHash && (
        <ReceiptVerifierModal receiptHash={verifyReceiptHash} onClose={() => setVerifyReceiptHash(null)} />
      )}
    </div>
  );
}
