"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
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
            <div role="status" className="py-6 text-center text-sm text-ink-700">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-action border-r-transparent" />
              <p className="mt-2 text-sm">Buscando el comprobante en la urna...</p>
            </div>
          )}

          {error && (
            <Alert tone="danger" role="alert" className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              <span>{error}</span>
            </Alert>
          )}

          {found && (
            <Alert tone="success" className="flex items-start gap-2 font-semibold">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              <span>Su boleta está en la urna y se contará en el escrutinio.</span>
            </Alert>
          )}

          <p className="break-all font-mono text-sm text-ink-600">{receiptHash}</p>

          <p className="flex items-start gap-2 border-t border-line pt-3 text-sm leading-relaxed text-ink-700">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" strokeWidth={2} aria-hidden />
            <span>
              El comprobante solo confirma que su boleta está en la urna. No muestra por quién votó, para que nadie
              pueda obligarle a demostrarlo.
            </span>
          </p>
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
