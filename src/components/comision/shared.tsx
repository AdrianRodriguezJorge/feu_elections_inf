import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/** Clases comunes de los controles de formulario (select, textarea) con el estilo "papeleta". */
export const fieldCls =
  "w-full min-h-11 rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-action focus:ring-2 focus:ring-action/20 focus:outline-hidden";

export const labelCls = "mb-1 block text-sm font-semibold text-ink-800";

export interface ActionMessage {
  ok: boolean;
  text: string;
}

/** Resultado de una acción: role="status" si fue bien, role="alert" si falló. */
export function ActionResult({ msg, className }: { msg: ActionMessage | null; className?: string }) {
  if (!msg) return null;
  return (
    <Alert role={msg.ok ? "status" : "alert"} tone={msg.ok ? "success" : "danger"} className={cn("mt-3", className)}>
      {msg.text}
    </Alert>
  );
}

/** Cifra con su etiqueta, sin cajas de color: como una casilla de un acta. */
export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="border-l border-line pl-4">
      <p className="text-sm text-ink-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-600">{note}</p>}
    </div>
  );
}

/** Barra de avance hacia el quórum, accesible como progressbar. */
export function QuorumProgress({
  id,
  votes,
  required,
  minPct,
  met,
}: {
  id: string;
  votes: number;
  required: number;
  minPct: string;
  met: boolean;
}) {
  const width = Math.min(100, required > 0 ? (votes / required) * 100 : 0);
  return (
    <div>
      <div className="mb-1 flex flex-wrap justify-between gap-1 text-sm text-ink-800">
        <span id={id} className="font-semibold">
          Avance hacia el quórum (más del {minPct})
        </span>
        <span className="tabular-nums">
          {votes} de {required} votos necesarios
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-sm border border-line bg-paper-200"
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={required}
        aria-valuenow={Math.min(votes, required)}
      >
        <div className={cn("h-full", met ? "bg-action" : "bg-warn-700")} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
