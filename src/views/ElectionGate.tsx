"use client";

import type { ReactNode } from "react";
import { useElection, type ElectionData } from "@/components/ElectionProvider";

/** Muestra carga o error hasta tener los datos de la elección. */
export function ElectionGate({ children }: { children: (data: ElectionData) => ReactNode }) {
  const { data, error, reload } = useElection();
  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-xl rounded-xl border border-danger-200 bg-danger-50 p-6 text-danger-900">
        <p className="font-semibold">{error}</p>
        <button type="button" onClick={() => reload()} className="mt-3 min-h-11 font-bold underline">
          Reintentar
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <p role="status" className="py-16 text-center text-sm text-ink-600">
        Cargando…
      </p>
    );
  }
  return <>{children(data)}</>;
}
