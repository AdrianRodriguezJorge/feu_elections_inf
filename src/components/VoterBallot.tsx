"use client";

import { useState } from "react";
import { Clipboard, Check, Search, AlertCircle, AlertTriangle, Vote, Star, Plus } from "lucide-react";
import { ProcessCandidateSnapshot } from "@/domain/candidates";
import { BallotSelection } from "@/domain/types";
import { BiographyModal } from "./BiographyModal";
import { ReceiptVerifierModal } from "./ReceiptVerifierModal";
import { AuthUser } from "./AuthModal";

export interface VoterInfo {
  ci: string;
  name: string;
  brigadeCode: string;
  hasVoted: boolean;
  receiptHash?: string;
}

interface VoterBallotProps {
  candidates: ProcessCandidateSnapshot[];
  seats: number;
  electors: VoterInfo[];
  selectedVoterCi: string;
  onSelectVoter: (ci: string) => void;
  onVoteCast: () => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
}

export function VoterBallot({
  candidates,
  seats,
  electors,
  selectedVoterCi,
  onSelectVoter: _onSelectVoter,
  onVoteCast,
  currentUser,
  onOpenAuth,
}: VoterBallotProps) {
  // Estado local de selecciones en la boleta
  const [memberMarks, setMemberMarks] = useState<Set<string>>(new Set());
  const [presidentMark, setPresidentMark] = useState<string | null>(null);

  // Modales
  const [bioCandidate, setBioCandidate] = useState<ProcessCandidateSnapshot | null>(null);
  const [showAnnulModal, setShowAnnulModal] = useState(false);
  const [verifyReceiptHash, setVerifyReceiptHash] = useState<string | null>(null);
  const [searchReceiptInput, setSearchReceiptInput] = useState("");
  const [showSearchBox, setShowSearchBox] = useState(false);

  // Copiado al portapapeles
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Estados de carga y error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    receiptHash: string;
    ballotStatus: string;
    timestamp: string;
  } | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const effectiveCi = currentUser?.ci || selectedVoterCi;
  const currentVoter = electors.find((e) => e.ci === effectiveCi);

  // Función para copiar comprobante
  const handleCopyReceipt = async (text: string) => {
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
    }
  };

  // Handlers de selección reactiva
  const toggleMember = (candidateId: string) => {
    setInlineError(null);
    const updated = new Set(memberMarks);

    if (updated.has(candidateId)) {
      updated.delete(candidateId);
      // Si era presidente, desmarcar también
      if (presidentMark === candidateId) {
        setPresidentMark(null);
      }
    } else {
      if (updated.size >= seats) {
        setInlineError(`Solo puedes marcar hasta ${seats} miembros para el Secretariado.`);
        return;
      }
      updated.add(candidateId);
    }
    setMemberMarks(updated);
  };

  const handleSelectPresident = (candidateId: string) => {
    setInlineError(null);
    // Si no está marcado como miembro, marcarlo automáticamente como miembro
    const updatedMembers = new Set(memberMarks);
    if (!updatedMembers.has(candidateId)) {
      if (updatedMembers.size >= seats) {
        setInlineError(
          `Para elegir a este candidato como presidente, primero debes desmarcar a otro miembro (máximo ${seats}).`,
        );
        return;
      }
      updatedMembers.add(candidateId);
      setMemberMarks(updatedMembers);
    }

    // Comportamiento de radio button: traslada la marca
    setPresidentMark(candidateId);
  };

  // Envío de voto válido
  const handleCastValidBallot = async () => {
    setInlineError(null);

    if (!effectiveCi) {
      setInlineError("Debe iniciar sesión para emitir su voto.");
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (memberMarks.size === 0) {
      setInlineError("Debes seleccionar al menos un candidato para emitir un voto válido.");
      return;
    }
    if (!presidentMark) {
      setInlineError("Debes seleccionar un Presidente entre los candidatos que marcaste como miembro.");
      return;
    }
    if (!memberMarks.has(presidentMark)) {
      setInlineError("El candidato seleccionado como Presidente también debe estar marcado como miembro.");
      return;
    }

    const selections: BallotSelection[] = candidates.map((c) => ({
      processCandidateId: c.candidateId,
      member: memberMarks.has(c.candidateId),
      president: presidentMark === c.candidateId,
    }));

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/voto/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterCi: effectiveCi,
          role: "VOTER",
          selections,
          isAnnulled: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInlineError(data.error || "No se pudo emitir el voto.");
        return;
      }

      setSubmitResult({
        receiptHash: data.receiptHash,
        ballotStatus: data.ballotStatus,
        timestamp: data.timestamp,
      });
      onVoteCast();
    } catch {
      setInlineError("Error de comunicación con el servidor electoral.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Envío de anulación voluntaria en 2 pasos
  const handleConfirmAnnulment = async () => {
    setShowAnnulModal(false);
    setInlineError(null);

    if (!effectiveCi) {
      setInlineError("Debe iniciar sesión para registrar su participación.");
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/voto/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterCi: effectiveCi,
          role: "VOTER",
          selections: [],
          isAnnulled: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInlineError(data.error || "No se pudo anular la boleta.");
        return;
      }

      setSubmitResult({
        receiptHash: data.receiptHash,
        ballotStatus: data.ballotStatus,
        timestamp: data.timestamp,
      });
      onVoteCast();
    } catch {
      setInlineError("Error de comunicación con el servidor electoral.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si el elector ya votó o acaba de emitir su voto
  if (submitResult || (currentVoter && currentVoter.hasVoted)) {
    const hash = submitResult?.receiptHash || currentVoter?.receiptHash;
    const statusLabel =
      submitResult?.ballotStatus === "ANULADA_POR_ELECTOR"
        ? "Boleta Anulada por el Elector"
        : "Voto Válido Depositado";

    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-6 sm:p-10 text-center shadow-lg">
        {/* Sello de Seguridad */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-8 ring-emerald-50/50">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <span className="inline-block rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wide">
          {statusLabel}
        </span>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Sufragio Registrado en la Urna Ciega
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Elector: <strong className="text-gray-900">{currentVoter?.name || currentUser?.name}</strong> · Carnet:{" "}
          <span className="font-mono">{currentVoter?.ci || currentUser?.ci}</span> · Brigada:{" "}
          <span className="font-semibold">{currentVoter?.brigadeCode || "Facultad"}</span>
        </p>

        {hash && (
          /* Tarjeta del Comprobante con Botón de Copiado */
          <div className="my-6 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5 text-left">
            <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Comprobante Criptográfico Oficial (SHA-256)
              </span>
              <span className="rounded bg-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Inmutable
              </span>
            </div>

            <div className="rounded-lg bg-white p-3 border border-emerald-100 font-mono text-xs sm:text-sm text-gray-800 break-all select-all">
              {hash}
            </div>

            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(hash)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-[#136D54] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#0C4B39] active:scale-95 cursor-pointer"
                >
                  {copiedReceipt ? (
                    <Check className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Clipboard className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span>{copiedReceipt ? "¡Comprobante copiado!" : "Copiar Comprobante"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVerifyReceiptHash(hash)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-[#136D54] bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-[#136D54] shadow-xs transition hover:bg-emerald-50 active:scale-95 cursor-pointer"
                >
                  <Search className="h-4 w-4" strokeWidth={2} />
                  <span>Ver Boleta en Urna</span>
                </button>
              </div>

              <span className="text-[11px] text-gray-500 text-center sm:text-right">
                Guarda este código para verificar tu participación.
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 leading-relaxed max-w-lg mx-auto">
          De conformidad con el principio de voto secreto, tu boleta ha sido depositada en la urna electrónica completamente desvinculada de tu identidad.
        </p>

        {/* Modal de Auditoría de Comprobante */}
        {verifyReceiptHash && (
          <ReceiptVerifierModal
            receiptHash={verifyReceiptHash}
            onClose={() => setVerifyReceiptHash(null)}
          />
        )}
      </div>
    );
  }

  // ESTADO 3: Elector autenticado listo para votar
  const presidentCandidate = candidates.find((c) => c.candidateId === presidentMark);

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6 pb-24 md:pb-8">
      {/* Barra de Acreditación del Elector (Identidad vinculada estrictamente al usuario autenticado) */}
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0">
              ID
            </span>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Elector Acreditado en el Listado Oficial
              </p>
              <p className="text-sm font-bold text-gray-900">
                {currentVoter ? currentVoter.name : (currentUser?.name || currentUser?.ci)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-gray-700 font-medium">
              Brigada: <strong className="text-gray-900">{currentVoter?.brigadeCode || "41"}</strong>
            </span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Habilitado para votar</span>
            </span>
          </div>
        </div>
      </div>

      {/* Acceso a Auditoría por Comprobante */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowSearchBox(!showSearchBox)}
          className="text-xs text-gray-600 hover:text-gray-900 underline flex items-center gap-1.5 font-medium"
        >
          <Search className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} />
          <span>{showSearchBox ? "Ocultar consulta" : "¿Tienes un comprobante? Consultar boleta en la urna"}</span>
        </button>
      </div>

      {showSearchBox && (
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={searchReceiptInput}
            onChange={(e) => setSearchReceiptInput(e.target.value)}
            placeholder="Pega aquí el código SHA-256 de un comprobante..."
            className="flex-1 rounded-lg border border-gray-300 p-2 text-xs font-mono text-gray-900 focus:border-[#136D54] focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => {
              if (searchReceiptInput.trim()) {
                setVerifyReceiptHash(searchReceiptInput.trim());
              }
            }}
            className="rounded-lg bg-[#136D54] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0C4B39]"
          >
            Buscar en Urna
          </button>
        </div>
      )}

      {/* Instrucciones y Marcadores */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Boleta Oficial · Elección del Secretariado
            </h2>
            <ul className="mt-1 list-disc pl-4 text-xs text-gray-600 space-y-0.5">
              <li>
                Marca <strong>hasta {seats} miembros</strong> para el Secretariado.
              </li>
              <li>
                Marca <strong>1 Presidente</strong> entre los candidatos que seleccionaste como miembro.
              </li>
            </ul>
          </div>

          {/* Contador en Vivo */}
          <div className="flex items-center justify-around sm:justify-end gap-3 rounded-lg bg-gray-50 p-2.5 sm:p-3 border border-gray-100">
            <div className="text-center sm:text-right">
              <span className="block text-[11px] text-gray-500 font-medium">Miembros marcados</span>
              <span className="text-base sm:text-lg font-bold text-gray-900">
                {memberMarks.size} <span className="text-xs font-normal text-gray-500">/ {seats}</span>
              </span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center sm:text-left min-w-[100px]">
              <span className="block text-[11px] text-gray-500 font-medium">Presidente</span>
              <span className="text-xs sm:text-sm font-bold text-amber-900 truncate block max-w-[130px]">
                {presidentCandidate ? presidentCandidate.name : "Pendiente"}
              </span>
            </div>
          </div>
        </div>

        {inlineError && (
          <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={2} />
            <span>{inlineError}</span>
          </div>
        )}
      </div>

      {/* VISTA 1: Escritorio / Tablets (Tabla de 4 Columnas) */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 text-center w-12">#</th>
              <th scope="col" className="px-4 py-3">Apellidos y Nombres</th>
              <th scope="col" className="px-4 py-3 text-center w-24">Brigada</th>
              <th scope="col" className="px-4 py-3 text-center w-32">
                Miembro
                <span className="block text-[10px] font-normal text-gray-500">(hasta {seats})</span>
              </th>
              <th scope="col" className="px-4 py-3 text-center w-32">
                Presidente
                <span className="block text-[10px] font-normal text-gray-500">(solo 1)</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-900">
            {candidates.map((candidate) => {
              const isMember = memberMarks.has(candidate.candidateId);
              const isPresident = presidentMark === candidate.candidateId;

              return (
                <tr
                  key={candidate.candidateId}
                  className={`transition-colors ${
                    isPresident
                      ? "bg-amber-50/70"
                      : isMember
                        ? "bg-emerald-50/40"
                        : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 text-center font-bold text-gray-400">
                    {candidate.ballotPosition}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{candidate.fullName}</div>
                    <button
                      type="button"
                      onClick={() => setBioCandidate(candidate)}
                      className="text-xs text-[#136D54] hover:underline"
                    >
                      Leer biografía y propuestas
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-medium text-gray-700">
                    {candidate.brigadeCode}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="inline-flex cursor-pointer items-center justify-center p-2">
                      <input
                        type="checkbox"
                        checked={isMember}
                        onChange={() => toggleMember(candidate.candidateId)}
                        className="h-5 w-5 rounded border-gray-300 text-[#136D54] focus:ring-[#136D54]"
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="inline-flex cursor-pointer items-center justify-center p-2">
                      <input
                        type="radio"
                        name="desktopPresidentSelection"
                        checked={isPresident}
                        onChange={() => handleSelectPresident(candidate.candidateId)}
                        className="h-5 w-5 text-amber-600 focus:ring-amber-500"
                      />
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VISTA 2: Móvil Android / Smartphones (Tarjetas Táctiles Optimizadas) */}
      <div className="block md:hidden space-y-3">
        <p className="text-xs font-semibold text-gray-500 px-1">
          Candidatos en orden alfabético de boleta:
        </p>
        {candidates.map((candidate) => {
          const isMember = memberMarks.has(candidate.candidateId);
          const isPresident = presidentMark === candidate.candidateId;

          return (
            <div
              key={candidate.candidateId}
              className={`rounded-xl border p-3.5 transition-all shadow-xs ${
                isPresident
                  ? "border-amber-300 bg-amber-50/50"
                  : isMember
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-gray-200 bg-white"
              }`}
            >
              {/* Encabezado del Candidato */}
              <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                    {candidate.ballotPosition}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">
                      {candidate.fullName}
                    </h3>
                    <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 mt-0.5">
                      Brigada {candidate.brigadeCode}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBioCandidate(candidate)}
                  className="shrink-0 text-[11px] font-semibold text-[#136D54] bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100"
                >
                  Propuestas
                </button>
              </div>

              {/* Botones de Selección Táctil Grande (Mínimo 48px para Android) */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {/* Opción Miembro */}
                <button
                  type="button"
                  onClick={() => toggleMember(candidate.candidateId)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 px-2 text-xs font-bold transition ${
                    isMember
                      ? "border-[#136D54] bg-[#136D54] text-white shadow-xs"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  {isMember ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  <span>{isMember ? "Miembro" : "Marcar Miembro"}</span>
                </button>

                {/* Opción Presidente */}
                <button
                  type="button"
                  onClick={() => handleSelectPresident(candidate.candidateId)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 px-2 text-xs font-bold transition ${
                    isPresident
                      ? "border-amber-600 bg-amber-600 text-white shadow-xs"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-amber-50 active:bg-amber-100"
                  }`}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${isPresident ? "fill-white text-white" : "text-gray-400"}`}
                    strokeWidth={2}
                  />
                  <span>{isPresident ? "Presidente" : "Marcar Presidente"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botonera de Acción Principal (Desktop y Normal) */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
        <button
          type="button"
          onClick={() => setShowAnnulModal(true)}
          disabled={isSubmitting}
          className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:bg-gray-100 text-center"
        >
          Anular boleta conscientemente
        </button>

        <button
          type="button"
          onClick={handleCastValidBallot}
          disabled={isSubmitting}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-[#136D54] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[#0C4B39] active:scale-95 disabled:opacity-50"
        >
          <Vote className="h-4 w-4" strokeWidth={2} />
          <span>{isSubmitting ? "Depositando voto..." : "Depositar Voto Válido en la Urna"}</span>
        </button>
      </div>

      {/* Barra Inferior Sticky para Android / Móvil */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-lg flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[11px] text-gray-500 font-medium truncate">
            {memberMarks.size} de {seats} miembros
          </span>
          <span className="block text-xs font-bold text-amber-900 truncate">
            {presidentCandidate ? `Pres: ${presidentCandidate.name}` : "Sin presidente"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCastValidBallot}
          disabled={isSubmitting}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#136D54] px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 active:scale-95"
        >
          <Vote className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Votar</span>
        </button>
      </div>

      {/* Modal de Biografía */}
      <BiographyModal
        candidate={bioCandidate}
        onClose={() => setBioCandidate(null)}
      />

      {/* Modal de Anulación en 2 Pasos */}
      {showAnnulModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-amber-300 bg-white p-5 sm:p-6 shadow-xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <AlertTriangle className="h-6 w-6 text-amber-700" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              ¿Deseas anular tu boleta conscientemente?
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
              En las elecciones de la FEU no existe el voto en blanco. Si decides no apoyar a los candidatos, tu boleta se registrará como <strong>anulada por el elector</strong>.
            </p>
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 leading-normal">
              <strong>Importante:</strong> Tu boleta sumará a la <strong>participación requerida de la facultad (&gt;85 %)</strong>, pero <strong>no otorgará votos</strong> a ningún candidato. Esta acción es irrevocable y consume tu voto.
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAnnulModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Regresar a la boleta
              </button>
              <button
                type="button"
                onClick={handleConfirmAnnulment}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-red-800"
              >
                Sí, anular boleta
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Auditoría de Comprobante */}
      {verifyReceiptHash && (
        <ReceiptVerifierModal
          receiptHash={verifyReceiptHash}
          onClose={() => setVerifyReceiptHash(null)}
        />
      )}
    </div>
  );
}
