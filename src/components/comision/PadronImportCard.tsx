"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionResult, fieldCls, labelCls, type ActionMessage } from "./shared";

const SAMPLE =
  "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada\n04051283921,Marcos,Valdés,Pérez,11\n03091482910,Laura,Díaz,Méndez,22";

/** Importación del registro de electores a partir de filas CSV. */
export function PadronImportCard({ effectivePct, onRefresh }: { effectivePct: number; onRefresh: () => void }) {
  const [csvInput, setCsvInput] = useState("");
  const [report, setReport] = useState<ActionMessage | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setReport(null);
    if (!csvInput.trim()) {
      setReport({ ok: false, text: "Pegue al menos una fila del listado de electores." });
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch("/api/padron/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvInput, minParticipationPercentage: effectivePct }),
      });
      const data = await res.json();
      if (res.ok) {
        setReport({
          ok: true,
          text: `Importación completada: ${data.recordsToAdd.length} electores nuevos y ${data.alreadyExistingCount} omitidos porque ya estaban registrados. Total de electores habilitados: ${data.totalEligibleAfter}. Votos necesarios para el quórum: ${data.minVotesRequired}.`,
        });
        setCsvInput("");
        onRefresh();
      } else {
        setReport({ ok: false, text: `No se pudo importar: ${data.errors?.[0]?.message || data.error || "revise los datos."}` });
      }
    } catch {
      setReport({ ok: false, text: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de electores</CardTitle>
        <CardDescription>
          Pegue filas del listado con el formato: carné de identidad, nombre, primer apellido, segundo apellido, brigada. Los
          carnés que ya estén registrados se omiten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label htmlFor="padron-csv" className={labelCls}>
          Filas del listado de electores
        </label>
        <textarea
          id="padron-csv"
          rows={4}
          value={csvInput}
          onChange={(e) => setCsvInput(e.target.value)}
          placeholder={`03080468489,Adán,Adán,Cabrera,41\n02052981315,Roxana,Almaguer,Sosa,41`}
          className={`${fieldCls} font-mono`}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" className="underline" onClick={() => setCsvInput(SAMPLE)}>
            Cargar ejemplo
          </Button>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? "Importando…" : "Importar electores (se omiten carnés repetidos)"}
          </Button>
        </div>
        <ActionResult msg={report} />
      </CardContent>
    </Card>
  );
}
