"use client";

import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnrichedTotal } from "./types";

function conditionOf(t: EnrichedTotal) {
  return t.isPresident ? "Presidente electo" : t.isElected ? "Electo" : "No electo";
}

function exportCsv(totals: EnrichedTotal[]) {
  const headers = "Candidato,Brigada,Votos para miembro,Votos para presidente,Condición\n";
  const rows = totals
    .map((t) => `"${t.fullName}","${t.brigadeCode}",${t.memberVotes},${t.presidentVotes},"${conditionOf(t)}"`)
    .join("\n");
  const blob = new Blob(["﻿" + headers + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `resultados-feu-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Hoja de conteo oficial: votos por candidato en el orden de la boleta. */
export function TallyTable({ totals, canProclaim }: { totals: EnrichedTotal[]; canProclaim: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Votos por candidato</CardTitle>
          <CardDescription>Ordenados según la boleta.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => exportCsv(totals)}>
            <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            <span>Descargar CSV</span>
          </Button>
          {canProclaim && (
            <Button asChild>
              <a href="/api/acta" download="acta-escrutinio-feu.pdf">
                <FileText className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span>Descargar acta en PDF</span>
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-ink-900">
          <thead className="border-b border-line-strong text-ink-700">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Candidato</th>
              <th scope="col" className="w-24 px-4 py-2.5 font-semibold">Brigada</th>
              <th scope="col" className="w-32 px-4 py-2.5 text-right font-semibold">Votos para miembro</th>
              <th scope="col" className="w-32 px-4 py-2.5 text-right font-semibold">Votos para presidente</th>
              <th scope="col" className="w-40 px-5 py-2.5 font-semibold">Condición</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {totals.map((t) => (
              <tr key={t.candidateId} className={t.isPresident ? "bg-paper-200/60" : undefined}>
                <th scope="row" className="px-5 py-2.5 font-semibold">{t.fullName}</th>
                <td className="px-4 py-2.5 tabular-nums text-ink-700">{t.brigadeCode}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{t.memberVotes}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{t.presidentVotes}</td>
                <td className="px-5 py-2.5">
                  {t.isPresident ? (
                    <Badge tone="action">Presidente</Badge>
                  ) : t.isElected ? (
                    <Badge tone="action">Electo</Badge>
                  ) : (
                    <Badge>No electo</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
