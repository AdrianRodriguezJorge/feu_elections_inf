"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, CheckCircle2, Lock } from "lucide-react";

interface ReceiptVerifierModalProps {
  receiptHash: string;
  onClose: () => void;
}

/**
 * Verifica que un comprobante esté en la urna. Solo confirma la inclusión:
 * no muestra el contenido de la boleta (así nadie puede demostrar cómo votó).
 */
export function ReceiptVerifierModal({ receiptHash, onClose }: ReceiptVerifierModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const res = await fetch(`/api/voto/comprobante?hash=${encodeURIComponent(receiptHash)}`);
        const data = await res.json();
        if (res.ok && data.found) {
          setMessage(data.message);
        } else {
          setError(data.error || "No hay ninguna boleta en la urna con ese comprobante.");
        }
      } catch {
        setError("No pudimos conectar con el servidor. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [receiptHash]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-verifier-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <h3 id="receipt-verifier-title" className="text-lg font-bold text-gray-900">
            Verificar comprobante
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="my-4 space-y-3" aria-live="polite">
          {loading && (
            <div role="status" className="py-6 text-center text-sm text-gray-600">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#136D54] border-r-transparent" />
              <p className="mt-2 text-xs">Buscando el comprobante en la urna...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" strokeWidth={2} />
              <span>{message}</span>
            </div>
          )}

          <p className="font-mono text-xs break-all text-gray-500">{receiptHash}</p>

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 border border-gray-100 leading-relaxed flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" strokeWidth={2} />
            <span>
              El comprobante solo confirma que tu boleta está en la urna. No muestra por quién votaste, para que nadie
              pueda obligarte a demostrarlo.
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="min-h-11 rounded-lg bg-[#136D54] px-4 py-2 text-sm font-bold text-white hover:bg-[#0C4B39]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
