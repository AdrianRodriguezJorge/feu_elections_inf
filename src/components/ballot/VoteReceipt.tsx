"use client";

import { useState } from "react";
import { Check, Clipboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReceiptVerifierModal } from "../ReceiptVerifierModal";

interface VoteReceiptProps {
  /** null cuando el elector ya había votado en otra sesión (no hay comprobante en memoria). */
  receiptHash: string | null;
  annulled: boolean;
  voterName: string;
  brigadeCode?: string | undefined;
}

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

/** Sello circular: el único momento expresivo tras confirmar el voto. */
function Seal({ label, tone }: { label: string; tone: "action" | "warn" }) {
  return (
    <div
      className={cn(
        "ballot-seal mx-auto flex h-40 w-40 -rotate-6 items-center justify-center rounded-full border-4 p-1.5",
        tone === "action" ? "border-action text-action" : "border-warn-700 text-warn-700",
      )}
    >
      <h2 className="flex h-full w-full items-center justify-center rounded-full border border-current px-3 text-center text-xl font-bold leading-tight">
        {label}
      </h2>
      <style>{`
        @keyframes ballot-seal-in { from { transform: scale(1.35) rotate(-6deg); opacity: 0; } to { transform: scale(1) rotate(-6deg); opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) { .ballot-seal { animation: ballot-seal-in 320ms cubic-bezier(.2,.8,.2,1) both; } }
      `}</style>
    </div>
  );
}

export function VoteReceipt({ receiptHash, annulled, voterName, brigadeCode }: VoteReceiptProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const title = !receiptHash ? "Ya votó" : annulled ? "Boleta anulada registrada" : "Voto registrado";

  const handleCopy = async (hash: string) => {
    setCopyError(false);
    try {
      await copyText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  return (
    <section className="mx-auto max-w-2xl rounded-md border border-line bg-white px-5 py-10 text-center sm:px-10">
      <div role="status">
        {receiptHash ? (
          <Seal label={title} tone={annulled ? "warn" : "action"} />
        ) : (
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{title}</h2>
        )}
      </div>

      <p className="mt-6 text-base text-ink-700">
        Elector: <strong className="text-ink-900">{voterName}</strong>
        {brigadeCode && <> · Brigada {brigadeCode}</>}
      </p>

      {annulled && (
        <p className="mt-3 text-base text-ink-700">
          Su boleta anulada cuenta para la participación, pero no suma votos a ningún candidato.
        </p>
      )}

      {!receiptHash && (
        <p className="mt-4 text-base text-ink-700">
          Su participación ya está registrada. Si guardó su comprobante, puede verificar que su boleta está en la urna.
        </p>
      )}

      {receiptHash && (
        <div className="mt-8 border-t border-line pt-6 text-left">
          <p className="text-sm font-bold text-ink-900">Su comprobante</p>
          <p className="mt-2 select-all break-all rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink-800">
            {receiptHash}
          </p>
          <p className="mt-2 text-sm text-ink-600">
            Guárdelo: es la única forma de comprobar que su boleta está en la urna.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" aria-label="Copiar comprobante" onClick={() => handleCopy(receiptHash)}>
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
              ) : (
                <Clipboard className="h-4 w-4" strokeWidth={2} aria-hidden />
              )}
              <span>{copied ? "Comprobante copiado" : "Copiar comprobante"}</span>
            </Button>
            <Button variant="secondary" onClick={() => setVerifying(true)}>
              <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
              <span>Verificar comprobante</span>
            </Button>
          </div>
          <p aria-live="polite" className="mt-2 text-sm text-ink-700">
            {copied ? "Comprobante copiado al portapapeles." : ""}
            {copyError ? "No se pudo copiar. Seleccione el comprobante y cópielo manualmente." : ""}
          </p>
        </div>
      )}

      <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-ink-600">
        Su voto es secreto: la boleta se guardó en la urna sin ningún dato que le identifique.
      </p>

      {verifying && receiptHash && (
        <ReceiptVerifierModal receiptHash={receiptHash} onClose={() => setVerifying(false)} />
      )}
    </section>
  );
}
