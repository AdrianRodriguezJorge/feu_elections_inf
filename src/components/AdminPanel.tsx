"use client";

import { useState } from "react";
import { Play, Square, RefreshCw, Check, AlertTriangle, Lock } from "lucide-react";
import { ProcessCandidateSnapshot } from "@/domain/candidates";
import { ProcessConfig } from "@/domain/config";
import { BiographyModal } from "./BiographyModal";

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
  config: ProcessConfig;
  candidates: ProcessCandidateSnapshot[];
  commission: Array<{ ci: string; name: string; office: string; brigadeCode: string }>;
  onRefresh: () => void;
}

export function AdminPanel({
  summary,
  config,
  candidates,
  commission,
  onRefresh,
}: AdminPanelProps) {
  // Estado local para importación del registro de electores
  const [csvInput, setCsvInput] = useState("");
  const [importReport, setImportReport] = useState<{ success: boolean; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Modal de biografía
  const [selectedBioCandidate, setSelectedBioCandidate] = useState<ProcessCandidateSnapshot | null>(null);

  // Estado local para configuración
  const [minPct, setMinPct] = useState(config.minParticipationPercentage);
  const [seatsMargin, setSeatsMargin] = useState(config.candidateSeatsMargin);
  const [configMsg, setConfigMsg] = useState<string | null>(null);

  // Acciones sobre el proceso
  const handleProcessAction = async (action: "ABRIR" | "CERRAR" | "REINICIAR") => {
    try {
      const res = await fetch("/api/eleccion/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch {
      alert("Error ejecutando acción sobre el proceso electoral.");
    }
  };

  // Guardar configuración dinámica
  const handleSaveConfig = async () => {
    try {
      const res = await fetch("/api/eleccion/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minParticipationPercentage: Number(minPct),
          candidateSeatsMargin: Number(seatsMargin),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfigMsg("Configuración guardada exitosamente.");
        onRefresh();
      } else {
        setConfigMsg(data.errors?.[0] || "Error guardando configuración.");
      }
    } catch {
      setConfigMsg("Error de conexión al guardar configuración.");
    }
  };

  // Importación incremental del registro de electores
  const handleImportPadron = async () => {
    if (!csvInput.trim()) {
      alert("Introduce líneas con el formato CSV del registro de electores.");
      return;
    }
    setIsImporting(true);
    setImportReport(null);

    try {
      const res = await fetch("/api/padron/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvInput,
          minParticipationPercentage: minPct,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportReport({
          success: true,
          message: `Importación completada: ${data.recordsToAdd.length} nuevos miembros agregados. ${data.alreadyExistingCount} omitidos por ya existir. Total de electores habilitados: ${data.totalEligibleAfter}. Votos requeridos: ${data.minVotesRequired}.`,
        });
        setCsvInput("");
        onRefresh();
      } else {
        setImportReport({
          success: false,
          message: `Error en importación: ${data.errors?.[0]?.message || "Verifica los datos."}`,
        });
      }
    } catch {
      setImportReport({
        success: false,
        message: "Error de conexión al importar el registro de electores.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Termómetro de Participación en Tiempo Real */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-feu-green-900">
              Estado de la Participación Electoral
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Monitoreo oficial de afluencia a las urnas en tiempo real
            </p>
          </div>
          <div className="flex gap-2">
            {summary.status !== "ABIERTA" && (
              <button
                onClick={() => handleProcessAction("ABRIR")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
              >
                <Play className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Abrir Votación</span>
              </button>
            )}
            {summary.status === "ABIERTA" && (
              <button
                onClick={() => handleProcessAction("CERRAR")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-800"
              >
                <Square className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Cerrar Votación y Sellar Urnas</span>
              </button>
            )}
            <button
              onClick={() => handleProcessAction("REINICIAR")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} />
              <span>Reiniciar Urnas</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-xs text-feu-green-700">Membresía Habilitada</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.totalEligible}</p>
            <p className="text-[11px] text-gray-500">Estudiantes activos</p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-xs text-feu-green-700">Boletas Depositadas</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.totalVotes}</p>
            <p className="text-[11px] text-gray-500">
              {summary.validBallots} válidas · {summary.annulledBallots} anuladas
            </p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-xs text-feu-green-700">Participación Actual</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.participationPct} %</p>
            <p className="text-[11px] text-gray-500">
              Meta requerida: &gt;{summary.minParticipationPercentage} %
            </p>
          </div>
          <div className="rounded-lg border border-feu-green-200 bg-feu-green-50/50 p-4">
            <p className="text-xs text-feu-green-700">Votos Mínimos Requeridos</p>
            <p className="text-2xl font-bold text-feu-green-900">{summary.minVotesRequired}</p>
            <p className="text-[11px] text-gray-500">
              {summary.requirementMet ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  Meta cumplida
                </span>
              ) : (
                `Faltan ${Math.max(0, summary.minVotesRequired - summary.totalVotes)}`
              )}
            </p>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-feu-green-900 mb-1">
            <span>Progreso hacia la Participación Requerida (&gt;{summary.minParticipationPercentage} %)</span>
            <span>{summary.totalVotes} de {summary.minVotesRequired} votos necesarios</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-500 ${
                summary.requirementMet ? "bg-emerald-600" : "bg-amber-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  summary.minVotesRequired > 0 ? (summary.totalVotes / summary.minVotesRequired) * 100 : 0,
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" strokeWidth={2} />
            <span>
              <strong>Principio de Urna Sellada:</strong> Durante el proceso abierto, los votos individuales por candidato permanecen cifrados y desacoplados. Nadie puede ver los resultados parciales hasta el cierre.
            </span>
          </p>
        </div>
      </div>

      {/* Gestión Incremental de la Membresía y Configuración */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Registro de Electores Incremental */}
        <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-feu-green-900">
            Registro de Electores (Carga Incremental)
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Puedes pegar filas del listado de electores (CI, Nombre, 1er. Apellido, 2do. Apellido, Brigada). Los Carnets repetidos serán omitidos automáticamente sin duplicarse.
          </p>

          <textarea
            rows={4}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={`03080468489,Adán,Adán,Cabrera,41\n02052981315,Roxana,Almaguer,Sosa,41`}
            className="mt-3 w-full rounded-lg border border-gray-300 p-2.5 font-mono text-xs text-gray-900 focus:border-feu-green-700 focus:outline-hidden"
          />

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => {
                setCsvInput(
                  "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada\n04051283921,Marcos,Valdés,Pérez,11\n03091482910,Laura,Díaz,Méndez,22",
                );
              }}
              className="text-xs text-feu-green-700 underline hover:text-feu-green-900"
            >
              Cargar plantilla de ejemplo
            </button>
            <button
              onClick={handleImportPadron}
              disabled={isImporting}
              className="rounded-lg bg-feu-green-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-feu-green-800 disabled:opacity-50"
            >
              {isImporting ? "Procesando..." : "Importar / Merge por CI"}
            </button>
          </div>

          {importReport && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                importReport.success
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {importReport.success ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" strokeWidth={2} />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" strokeWidth={2} />
              )}
              <span>{importReport.message}</span>
            </div>
          )}
        </div>

        {/* Configuración Dinámica */}
        <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-feu-green-900">
            Parámetros del Proceso Electoral
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Ajusta los umbrales reglamentarios para esta convocatoria.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="minPctInput" className="text-xs font-semibold text-feu-green-900">
                Porcentaje de Participación Mínima Requerida (%):
              </label>
              <input
                id="minPctInput"
                type="number"
                min={50}
                max={100}
                value={minPct}
                onChange={(e) => setMinPct(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-feu-green-700 focus:outline-hidden"
              />
              <span className="text-[11px] text-gray-500">
                Por defecto según Art. 38 del ABC: &gt;85 %
              </span>
            </div>

            <div>
              <label htmlFor="seatsMarginInput" className="text-xs font-semibold text-feu-green-900">
                Margen de Escaños (N = Candidatos - Margen):
              </label>
              <input
                id="seatsMarginInput"
                type="number"
                min={1}
                max={5}
                value={seatsMargin}
                onChange={(e) => setSeatsMargin(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:border-feu-green-700 focus:outline-hidden"
              />
              <span className="text-[11px] text-gray-500">
                Por defecto según Art. 59: N = candidatos - 2 (11 candidatos → 9 puestos)
              </span>
            </div>

            <button
              onClick={handleSaveConfig}
              className="mt-2 w-full rounded-lg bg-feu-green-700 py-2 text-xs font-bold text-white shadow-xs hover:bg-feu-green-800"
            >
              Guardar Configuración
            </button>

            {configMsg && (
              <p className="text-center text-xs font-medium text-feu-green-800">
                {configMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Candidaturas Oficiales Congeladas */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-feu-green-900">
              Candidaturas Oficiales
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {summary.seats} puestos en disputa de {summary.candidatesCount} candidaturas (Art. 59) · Orden alfabético
            </p>
          </div>
        </div>

        <div className="mt-3 divide-y divide-gray-100 text-sm">
          {candidates.map((c) => (
            <div key={c.candidateId} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-feu-green-100 text-xs font-bold text-feu-green-800">
                  {c.ballotPosition}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{c.fullName}</p>
                  <p className="text-xs text-gray-500">
                    CI: {c.ci} · Brigada: {c.brigadeCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBioCandidate(c)}
                className="text-xs text-feu-green-700 underline hover:text-feu-green-900"
              >
                Ver Biografía
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Comisión Electoral Constituida */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-feu-green-900">
          Comisión Electoral Constituida (Art. 47)
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Autoridades electorales de la Facultad
        </p>
        <div className="mt-3 divide-y divide-gray-100">
          {commission.map((member) => (
            <div key={member.ci} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-semibold text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">
                  CI: {member.ci} · Brigada: {member.brigadeCode}
                </p>
              </div>
              <span className="rounded-full bg-feu-green-100 px-3 py-1 text-xs font-bold text-feu-green-800 uppercase">
                {member.office}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Biografía */}
      <BiographyModal
        candidate={selectedBioCandidate}
        onClose={() => setSelectedBioCandidate(null)}
      />
    </div>
  );
}
