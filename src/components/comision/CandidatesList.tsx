"use client";

import { useState } from "react";
import type { ProcessCandidateSnapshot } from "@/domain/candidates";
import { BiographyModal } from "@/components/BiographyModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Listado de candidaturas en el orden de la boleta, con acceso a la biografía. */
export function CandidatesList({
  candidates,
  seats,
  candidatesCount,
}: {
  candidates: ProcessCandidateSnapshot[];
  seats: number;
  candidatesCount: number;
}) {
  const [selected, setSelected] = useState<ProcessCandidateSnapshot | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidaturas</CardTitle>
        <CardDescription>
          {seats} puestos para {candidatesCount} candidaturas (Art. 59), en orden alfabético.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2">
        {candidates.length === 0 ? (
          <p className="py-2 text-sm text-ink-700">Todavía no hay candidaturas registradas.</p>
        ) : (
          <ol className="divide-y divide-line text-sm">
            {candidates.map((c) => (
              <li key={c.candidateId} className="flex items-center justify-between gap-2 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-right font-bold tabular-nums text-ink-600">{c.ballotPosition}.</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{c.fullName}</p>
                    <p className="text-xs text-ink-600">
                      Carné {c.ci}, brigada {c.brigadeCode}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" className="shrink-0 underline" onClick={() => setSelected(c)}>
                  Ver biografía<span className="sr-only"> de {c.fullName}</span>
                </Button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
      <BiographyModal candidate={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}
