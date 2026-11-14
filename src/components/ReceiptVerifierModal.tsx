"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [found, setFound] = useState(false);

  useEffect(() => {
    async function verify() {
      setLoading(true);
      setError(null);
      setFound(false);
      try {
        const res = await fetch(`/api/voto/comprobante?hash=${encodeURIComponent(receiptHash)}`);
        const data = await res.json();
        if (res.ok && data.found) {
          setFound(true);
        } else {
          setError(
            "No hay ninguna boleta en la urna con ese comprobante. Revise que lo haya copiado completo y sin espacios.",
          );
        }
      } catch {
        setError("No se pudo conectar con el servidor. Revise su conexión e inténtelo de nuevo.");
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [receiptHash]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verificar comprobante</DialogTitle>
          <DialogDescription>Comprobamos si su boleta está en la urna.</DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-3" aria-live="polite">
          {loading && (
            <div role="status" className="py-6 text-center text-sm text-gray-700">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-cujae-green-500 border-r-transparent" />
              <p className="mt-2 text-sm">Buscando el comprobante en la urna...</p>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {found && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
              <span>Su boleta está en la urna y se contará en el escrutinio.</span>
            </div>
          )}

          <p className="font-mono text-xs break-all text-gray-600">{receiptHash}</p>

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 border border-gray-100 leading-relaxed flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
            <span>
              El comprobante solo confirma que su boleta está en la urna. No muestra por quién votó, para que nadie
              pueda obligarle a demostrarlo.
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="primary">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
