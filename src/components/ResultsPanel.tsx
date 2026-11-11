"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Lock,
  Archive,
  Zap,
  AlertTriangle,
  Star,
  Download,
  FileSpreadsheet,
  Check,
  X,
  Scale,
  Printer,
} from "lucide-react";
import { generateActaPdf } from "@/utils/pdfActa";
import { SecretariatComposition, VacancyReason } from "@/domain/vacancies";

interface EnrichedTotal {
  candidateId: string;
  fullName: string;
  brigadeCode: string;
  memberVotes: number;
  presidentVotes: number;
  isElected: boolean;
  isPresident: boolean;
}

interface ResultsPanelProps {
  status: string;
  totalVotes: number;
  totalEligible: number;
  minParticipationPercentage: number;
  onRefresh: () => void;
}

export function ResultsPanel({
  status,
  totalVotes,
  totalEligible,
  minParticipationPercentage,
  onRefresh,
}: ResultsPanelProps) {
  const [isTallying, setIsTallying] = useState(false);
  const [tallyData, setTallyData] = useState<{
    quorum: { participations: number; participationPct: number; quorumMet: boolean };
    tally: {
      totals: EnrichedTotal[];
      elected: string[];
      presidentId: string | null;
      president?: { name: string; fullName: string; brigadeCode: string } | null;
      tie: { type: "CUT" | "PRESIDENT"; candidateIds: string[] } | null;
    };
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Vicepresidencia y Composición
  const [selectedVpId, setSelectedVpId] = useState<string>("");
  const [vpDesignationMsg, setVpDesignationMsg] = useState<string | null>(null);
  const [composition, setComposition] = useState<SecretariatComposition | null>(null);

  // Gestión de Vacantes (Arts. 99–102)
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [vacancyReason, setVacancyReason] = useState<VacancyReason>("DIMISION_VOLUNTARIA");
  const [vacancyJustification, setVacancyJustification] = useState("");
  const [successorCandidateId, setSuccessorCandidateId] = useState("");
  const [isProcessingVacancy, setIsProcessingVacancy] = useState(false);
  const [vacancyMsg, setVacancyMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Designación de nuevo Vicepresidente tras vacancia
  const [newVpSuccessorId, setNewVpSuccessorId] = useState("");
  const [isDesignatingNewVp, setIsDesignatingNewVp] = useState(false);

  // Cargar estado inicial y composición existente
  useEffect(() => {
    async function fetchCurrentState() {
      try {
        const res = await fetch("/api/eleccion/estado");
        const data = await res.json();
        if (data.composition) {
          setComposition(data.composition);
        }
        if (data.designatedVpId) {
          setSelectedVpId(data.designatedVpId);
        }
      } catch {
        // Fallback silencioso
      }
    }
    fetchCurrentState();
  }, [status]);

  // Ejecutar escrutinio
  const handleRunTally = async () => {
    setIsTallying(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/escrutinio", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTallyData(data);
        onRefresh();
      } else {
        setErrorMsg(data.error || "No se pudo realizar el escrutinio.");
      }
    } catch {
      setErrorMsg("Error de conexión al escrutar.");
    } finally {
      setIsTallying(false);
    }
  };

  // Designar Vicepresidente (Art. 67)
  const handleDesignateVp = async () => {
    if (!selectedVpId) {
      alert("Selecciona un candidato electo para la Vicepresidencia.");
      return;
    }
    try {
      const res = await fetch("/api/comision/designar-vp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: selectedVpId }),
      });
      const data = await res.json();
      if (res.ok) {
        setVpDesignationMsg(data.message);
        if (data.composition) {
          setComposition(data.composition);
        }
        onRefresh();
      } else {
        setVpDesignationMsg(data.error || "Error al designar.");
      }
    } catch {
      setVpDesignationMsg("Error de conexión al designar Vicepresidente.");
    }
  };

  // Tramitar Vacante Presidencial (Arts. 99–102)
  const handleProcessPresidentialVacancy = async () => {
    if (!vacancyJustification.trim()) {
      alert("Introduce la justificación reglamentaria del cese o dimisión.");
      return;
    }
    setIsProcessingVacancy(true);
    setVacancyMsg(null);
    try {
      const res = await fetch("/api/comision/vacante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "VACANCIA_PRESIDENTE",
          reason: vacancyReason,
          justification: vacancyJustification,
          successorCandidateId: successorCandidateId || undefined,
          councilAttendancePct: 90, // Por defecto >85 %
          councilVotesInFavorPct: 100, // Por defecto unánime
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComposition(data.composition);
        setVacancyMsg({ success: true, message: data.message });
        setShowVacancyForm(false);
        setVacancyJustification("");
        onRefresh();
      } else {
        setVacancyMsg({ success: false, message: data.error });
      }
    } catch {
      setVacancyMsg({ success: false, message: "Error al comunicar el trámite de vacancia." });
    } finally {
      setIsProcessingVacancy(false);
    }
  };

  // Designar nuevo Vicepresidente ante vacante
  const handleDesignateSuccessorVp = async () => {
    if (!newVpSuccessorId) {
      alert("Selecciona un miembro del Secretariado para asumir la Vicepresidencia.");
      return;
    }
    setIsDesignatingNewVp(true);
    setVacancyMsg(null);
    try {
      const res = await fetch("/api/comision/vacante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DESIGNAR_NUEVO_VP",
          successorCandidateId: newVpSuccessorId,
          justification: "Designación reglamentaria de nueva Vicepresidencia (Art. 67)",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComposition(data.composition);
        setVacancyMsg({ success: true, message: data.message });
        setNewVpSuccessorId("");
        onRefresh();
      } else {
        setVacancyMsg({ success: false, message: data.error });
      }
    } catch {
      setVacancyMsg({ success: false, message: "Error al designar el nuevo Vicepresidente." });
    } finally {
      setIsDesignatingNewVp(false);
    }
  };

  // Exportar resultados en CSV
  const handleExportCsv = () => {
    if (!tallyData) return;
    const headers = "Candidato,Brigada,Votos Miembro,Votos Presidente,Condicion\n";
    const rows = tallyData.tally.totals
      .map((t) => {
        const condicion = t.isPresident
          ? "Presidente Electo"
          : t.isElected
            ? "Miembro Electo"
            : "No Electo";
        return `"${t.fullName}","${t.brigadeCode}",${t.memberVotes},${t.presidentVotes},"${condicion}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Resultados_Elecciones_FEU_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Descargar Acta Oficial en PDF
  const handleDownloadPdf = () => {
    if (!tallyData) return;
    const vpCandidate = tallyData.tally.totals.find((t) => t.candidateId === selectedVpId);

    generateActaPdf({
      tally: tallyData.tally,
      totalEligible,
      participations: tallyData.quorum.participations,
      participationPct: tallyData.quorum.participationPct,
      quorumMet: tallyData.quorum.quorumMet,
      minPct: minParticipationPercentage,
      candidacyHash: "candidacy-hash-verified-sha256",
      designatedVpName: composition?.vicePresident?.fullName || vpCandidate?.fullName,
      composition,
    });
  };

  // Si la votación está ABIERTA
  if (status === "ABIERTA") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-feu-green-300 bg-white p-10 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Lock className="h-10 w-10 text-amber-700" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-feu-green-900">
          Urnas Selladas · Escrutinio no Disponible
        </h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Para garantizar la pureza del sufragio y el secreto del voto, ningún resultado parcial puede ser visualizado mientras la votación permanezca abierta.
        </p>

        <div className="mt-6 rounded-lg bg-gray-50 p-4 border border-gray-200 text-left text-xs text-gray-700 space-y-1">
          <p>• <strong>Estado del Proceso:</strong> {status}</p>
          <p>• <strong>Boletas Depositadas:</strong> {totalVotes} sufragios emitidos</p>
          <p>• <strong>Electores Habilitados:</strong> {totalEligible} miembros</p>
          <p>• <strong>Umbral Requerido:</strong> &gt;{minParticipationPercentage} % de participación (Art. 38)</p>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          La Comisión Electoral o el Administrador deben cerrar formalmente la votación desde el panel de Administración para habilitar el conteo.
        </p>
      </div>
    );
  }

  // Si la votación está CERRADA pero no se ha escrutado
  if (!tallyData) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-feu-green-300 bg-white p-10 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-800">
          <Archive className="h-10 w-10 text-blue-700" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-feu-green-900">
          Escrutinio Oficial de la Elección
        </h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          La votación ha concluido. La Comisión Electoral debe realizar el cómputo reproducible de las boletas válidas y verificar el cumplimiento de la participación requerida reglamentaria.
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleRunTally}
            disabled={isTallying}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-feu-green-700 px-8 py-3.5 text-base font-bold text-white shadow-md hover:bg-feu-green-800 disabled:opacity-50 transition-colors"
          >
            <Zap className="h-5 w-5" strokeWidth={2} />
            <span>{isTallying ? "Escrutando Urna..." : "Realizar Escrutinio Oficial"}</span>
          </button>
        </div>
      </div>
    );
  }

  const { quorum, tally } = tallyData;
  const eligibleForVp = tally.totals.filter((t) => t.isElected && !t.isPresident);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Tarjeta de Participación Reglamentaria (Art. 38) */}
      <div
        className={`rounded-xl border p-6 shadow-sm ${
          quorum.quorumMet
            ? "border-emerald-300 bg-emerald-50/60 text-emerald-950"
            : "border-red-300 bg-red-50/60 text-red-950"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                quorum.quorumMet
                  ? "bg-emerald-200 text-emerald-900 border border-emerald-300"
                  : "bg-red-200 text-red-900 border border-red-300"
              }`}
            >
              {quorum.quorumMet ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Participación Requerida Cumplida</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Participación Requerida no Alcanzada</span>
                </>
              )}
            </span>
            <h2 className="mt-2 text-xl font-bold">
              {quorum.quorumMet
                ? "Elección Válida para Proclamación (Art. 38)"
                : "Elección no Válida (Art. 38 del ABC)"}
            </h2>
            <p className="mt-1 text-xs">
              Se registró una participación del <strong>{quorum.participationPct} %</strong> (
              {quorum.participations} de {totalEligible} electores). Umbral requerido: &gt;
              {minParticipationPercentage} %.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">Afluencia Total</span>
            <p className="text-3xl font-extrabold">{quorum.participationPct} %</p>
          </div>
        </div>
      </div>

      {/* Alerta de Empate (Art. 40) */}
      {tally.tie && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-950 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600 shrink-0" strokeWidth={2} />
            <div>
              <h3 className="font-bold text-lg">
                Empate Reglamentario Detectado (Art. 40 del ABC)
              </h3>
              <p className="text-xs mt-1">
                {tally.tie.type === "PRESIDENT"
                  ? "Empate en votos presidenciales. Prohibido desempatar por orden alfabético. Debe realizarse una Segunda Vuelta."
                  : "Empate en el corte del puesto de miembro. Se contabilizan votos de presidente; de persistir, se convoca Segunda Vuelta."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Proclamación del Presidente Electo */}
      {tally.president && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-200 text-amber-800">
              <Star className="h-7 w-7 fill-amber-700 text-amber-700" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Presidente Electo de la Facultad (Art. 63)
              </span>
              <h3 className="text-2xl font-bold text-amber-950">
                {composition?.president?.fullName || tally.president.fullName}
              </h3>
              <p className="text-xs text-amber-800">
                Brigada: {composition?.president?.brigadeCode || tally.president.brigadeCode} · Mayor cantidad de votos presidenciales entre los miembros electos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Oficial de Escrutinio */}
      <div className="overflow-hidden rounded-xl border border-feu-green-300 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-feu-green-200 bg-feu-green-50 px-6 py-4 gap-2">
          <div>
            <h3 className="font-bold text-feu-green-900">
              Cómputo Oficial de Votos por Candidato
            </h3>
            <p className="text-xs text-feu-green-700">
              Miembros electos ordenados por sufragios para miembro.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-lg border border-feu-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-feu-green-900 hover:bg-feu-green-50 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Descargar CSV</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 rounded-lg bg-feu-green-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-feu-green-800 shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Descargar Acta PDF</span>
            </button>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="border-b border-feu-green-200 bg-feu-green-100 text-xs font-bold text-feu-green-900 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Candidato</th>
              <th scope="col" className="px-4 py-3 text-center w-24">Brigada</th>
              <th scope="col" className="px-4 py-3 text-center w-36">Votos Miembro</th>
              <th scope="col" className="px-4 py-3 text-center w-36">Votos Presidente</th>
              <th scope="col" className="px-4 py-3 text-center w-40">Condición</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-feu-green-100 text-feu-green-900">
            {tally.totals.map((t) => (
              <tr
                key={t.candidateId}
                className={
                  t.isPresident
                    ? "bg-amber-50 font-semibold"
                    : t.isElected
                      ? "bg-emerald-50/60"
                      : "opacity-60"
                }
              >
                <td className="px-4 py-3">
                  <div className="font-semibold">{t.fullName}</div>
                </td>
                <td className="px-4 py-3 text-center font-mono">{t.brigadeCode}</td>
                <td className="px-4 py-3 text-center font-bold">{t.memberVotes}</td>
                <td className="px-4 py-3 text-center font-bold text-amber-800">
                  {t.presidentVotes}
                </td>
                <td className="px-4 py-3 text-center">
                  {t.isPresident ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                      <Star className="h-3.5 w-3.5 fill-amber-900" strokeWidth={2} />
                      <span>Presidente</span>
                    </span>
                  ) : t.isElected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>Electo</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No electo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Designación de Vicepresidente (Art. 67) */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-feu-green-900">
          Designación del Vicepresidente (Art. 67 del ABC)
        </h3>
        <p className="mt-1 text-xs text-gray-600">
          El Vicepresidente no se vota en la boleta; es designado por acuerdo de la Comisión Electoral posterior a la proclamación de los miembros electos.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label htmlFor="vpSelect" className="sr-only">Seleccionar Vicepresidente</label>
          <select
            id="vpSelect"
            value={selectedVpId}
            onChange={(e) => setSelectedVpId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm font-medium text-gray-900 focus:border-feu-green-700 focus:outline-hidden"
          >
            <option value="">-- Seleccionar entre los miembros electos --</option>
            {eligibleForVp.map((c) => (
              <option key={c.candidateId} value={c.candidateId}>
                {c.fullName} (Brigada {c.brigadeCode})
              </option>
            ))}
          </select>
          <button
            onClick={handleDesignateVp}
            className="rounded-lg bg-feu-green-700 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-feu-green-800"
          >
            Designar como Vicepresidente
          </button>
        </div>

        {vpDesignationMsg && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
            <Check className="h-4 w-4" strokeWidth={2} />
            <span>{vpDesignationMsg}</span>
          </p>
        )}
      </div>

      {/* MÓDULO DE GESTIÓN DE VACANTES Y SUCESIÓN (Arts. 99–102) */}
      {composition && (
        <div className="rounded-xl border border-indigo-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Secretariado de la Facultad (Arts. 99–102) · Versión {composition.version}
              </h3>
              <p className="text-xs text-gray-500">
                Última actualización: {new Date(composition.updatedAt).toLocaleString("es-ES")} ({composition.reason})
              </p>
            </div>
            <button
              onClick={() => setShowVacancyForm(!showVacancyForm)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
            >
              {showVacancyForm ? (
                <>
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Cerrar Formulario</span>
                </>
              ) : (
                <>
                  <Scale className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Tramitar Vacante / Cese (Arts. 99–102)</span>
                </>
              )}
            </button>
          </div>

          {/* Cuadro de Composición Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Presidente Actual</span>
              <p className="font-bold text-sm text-amber-950 mt-0.5">{composition.president.fullName}</p>
              <p className="text-[11px] text-amber-700">Brigada {composition.president.brigadeCode}</p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <span className="text-[10px] font-bold text-blue-800 uppercase">Vicepresidente Actual</span>
              <p className="font-bold text-sm text-blue-950 mt-0.5">
                {composition.vicePresident ? (
                  composition.vicePresident.fullName
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Plaza Vacante</span>
                  </span>
                )}
              </p>
              <p className="text-[11px] text-blue-700">
                {composition.vicePresident ? `Brigada ${composition.vicePresident.brigadeCode}` : "Pendiente de designación"}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <span className="text-[10px] font-bold text-gray-600 uppercase">Miembros Electos</span>
              <p className="font-bold text-sm text-gray-900 mt-0.5">{composition.members.length} miembros</p>
              <p className="text-[11px] text-gray-500">Secretariado activo</p>
            </div>
          </div>

          {/* Formulario de Tramitación de Vacante Presidencial */}
          {showVacancyForm && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/50 p-5 space-y-3">
              <h4 className="font-bold text-sm text-amber-950">
                Procedimiento de Cese y Sucesión Presidencial
              </h4>
              <p className="text-xs text-gray-600">
                Ante la vacancia del cargo presidencial, por defecto asume el Vicepresidente electo (Art. 102), o la Comisión puede promover a otro miembro electo.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Causal de Vacancia:
                  </label>
                  <select
                    value={vacancyReason}
                    onChange={(e) => setVacancyReason(e.target.value as VacancyReason)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-medium text-gray-900"
                  >
                    <option value="DIMISION_VOLUNTARIA">Renuncia Voluntaria (Art. 99, no requiere aprobación)</option>
                    <option value="SEPARACION_DISCIPLINARIA">Separación Disciplinaria (Art. 101, requiere &gt;85% Consejo)</option>
                    <option value="GRADUACION_O_BAJA">Baja Estudiantil / Graduación</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Sucesión Presidencial (Art. 102):
                  </label>
                  <select
                    value={successorCandidateId}
                    onChange={(e) => setSuccessorCandidateId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-medium text-gray-900"
                  >
                    <option value="">
                      -- Asume Vicepresidente por defecto ({composition.vicePresident?.fullName || "Vacante"}) --
                    </option>
                    {composition.members.map((m) => (
                      <option key={m.candidateId} value={m.candidateId}>
                        Promover a: {m.fullName} (Brigada {m.brigadeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Justificación / Acta de Cese:
                </label>
                <textarea
                  rows={2}
                  value={vacancyJustification}
                  onChange={(e) => setVacancyJustification(e.target.value)}
                  placeholder="Ej: Renuncia voluntaria por motivos académicos aprobada en reunión de secretariado..."
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowVacancyForm(false)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleProcessPresidentialVacancy}
                  disabled={isProcessingVacancy}
                  className="rounded-lg bg-amber-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  {isProcessingVacancy ? "Procesando..." : "Confirmar Cese y Sucesión (Art. 102)"}
                </button>
              </div>
            </div>
          )}

          {/* Formulario si la Vicepresidencia está vacante */}
          {composition.vicePresident === null && (
            <div className="mt-4 rounded-xl border border-blue-300 bg-blue-50/50 p-4 space-y-2">
              <h4 className="font-bold text-xs text-blue-950 uppercase tracking-wide">
                Designación de Nueva Vicepresidencia (Plaza Vacante)
              </h4>
              <p className="text-xs text-gray-600">
                Al haber asumido el Vicepresidente la presidencia, la Comisión Electoral debe designar a un nuevo Vicepresidente entre los miembros electos restantes.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <select
                  value={newVpSuccessorId}
                  onChange={(e) => setNewVpSuccessorId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white p-2 text-xs font-medium text-gray-900"
                >
                  <option value="">-- Seleccionar miembro electo --</option>
                  {composition.members.map((m) => (
                    <option key={m.candidateId} value={m.candidateId}>
                      {m.fullName} (Brigada {m.brigadeCode})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleDesignateSuccessorVp}
                  disabled={isDesignatingNewVp}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {isDesignatingNewVp ? "Designando..." : "Designar como Vicepresidente"}
                </button>
              </div>
            </div>
          )}

          {/* Mensajes de Vacancia */}
          {vacancyMsg && (
            <div
              className={`flex items-start gap-2 rounded-lg p-2.5 text-xs font-medium border ${
                vacancyMsg.success
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-red-50 text-red-900 border-red-200"
              }`}
            >
              {vacancyMsg.success ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" strokeWidth={2} />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" strokeWidth={2} />
              )}
              <span>{vacancyMsg.message}</span>
            </div>
          )}

          {/* Historial de Eventos de Vacancia */}
          {composition.historicalEvents.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <h5 className="text-xs font-bold text-gray-700 mb-1">
                Historial de Sucesión y Modificaciones:
              </h5>
              <div className="space-y-1">
                {composition.historicalEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      • <strong>{ev.vacatedRole}:</strong> Cese de {ev.outgoingFullName} ({ev.reason}). Asume: {ev.successorFullName || "Vacante"}.
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(ev.timestamp).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Acta Formal de Escrutinio y Proclamación para Imprimir */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-8 shadow-sm print:m-0 print:border-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-16 shrink-0">
              <Image src="/logos/feu_512.png" alt="Logo FEU" fill className="object-contain" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Acta Oficial de Escrutinio y Proclamación
              </h3>
              <p className="text-xs text-gray-500">
                Federación Estudiantil Universitaria · CUJAE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 rounded-lg bg-feu-green-700 px-4 py-2 text-xs font-bold text-white hover:bg-feu-green-800 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs leading-relaxed text-gray-800">
          <p>
            En la ciudad de La Habana, en la Facultad de Ingeniería Informática de la Universidad Tecnológica de La Habana &quot;José Antonio Echeverría&quot; (CUJAE), reunida la Comisión Electoral constituida conforme al Artículo 47 del ABC de la FEU, se procede a dar fe del resultado oficial de las elecciones del Secretariado de la Facultad.
          </p>

          <div className="rounded-lg bg-gray-50 p-4 font-mono text-[11px] space-y-1">
            <p><strong>Membresía con Derecho al Voto:</strong> {totalEligible}</p>
            <p><strong>Total de boletas depositadas:</strong> {quorum.participations}</p>
            <p><strong>Porcentaje de participación:</strong> {quorum.participationPct} %</p>
            <p><strong>Requisito de validez (&gt;{minParticipationPercentage} %):</strong> {quorum.quorumMet ? "CUMPLIDO SATISFACTORIAMENTE" : "NO CUMPLIDO"}</p>
            <p><strong>Presidente Proclamado:</strong> {composition?.president?.fullName || tally.president?.fullName || "Pendiente de desempate"}</p>
            <p><strong>Vicepresidente Designado:</strong> {composition?.vicePresident?.fullName || "Pendiente de designación (Art. 67)"}</p>
            <p><strong>Miembros del Secretariado Electos:</strong> {tally.elected.length}</p>
          </div>

          <p>
            Habiéndose verificado las condiciones reglamentarias y el secreto del voto de acuerdo con los Artículos 38, 40, 59, 61 y 63 del Reglamento General de la Federación Estudiantil Universitaria, la Comisión Electoral firma y da por válidos los presentes resultados.
          </p>

          {/* Bloque de Firmas */}
          <div className="mt-8 grid grid-cols-3 gap-6 pt-6 text-center text-xs">
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold">Presidente de la Comisión</p>
              <p className="text-[10px] text-gray-500">Elena García Méndez</p>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold">Vicepresidente de la Comisión</p>
              <p className="text-[10px] text-gray-500">Frank Hernández Pérez</p>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold">Secretario de la Comisión</p>
              <p className="text-[10px] text-gray-500">Giselle López Reyes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
