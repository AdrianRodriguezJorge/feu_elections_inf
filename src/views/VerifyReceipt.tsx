"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

/** Formulario público para comprobar que un comprobante está en la urna. */
export function VerifyReceipt() {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const clean = hash.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      setResult({ ok: false, text: "El comprobante tiene 64 caracteres: números y letras de la a a la f." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/voto/comprobante?hash=${clean}`);
      const data = await res.json();
      setResult(
        res.ok && data.found
          ? { ok: true, text: "La boleta está en la urna y se contará en el escrutinio." }
          : { ok: false, text: data.error ?? "No hay ninguna boleta en la urna con ese comprobante." },
      );
    } catch {
      setResult({ ok: false, text: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={verify} className="mx-auto max-w-xl space-y-5 rounded-md border border-line bg-white px-5 py-8 sm:px-8" noValidate>
      <h1 className="text-2xl font-bold text-ink-900">Verificar un comprobante</h1>
      <p className="text-ink-700">
        El comprobante solo confirma que la boleta está en la urna. No muestra por quién se votó, para que nadie pueda
        obligar a demostrarlo.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="receipt">Comprobante</Label>
        <Input
          id="receipt"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-describedby={result ? "receipt-result" : undefined}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Verificando…" : "Verificar"}
      </Button>
      {result && (
        <Alert id="receipt-result" tone={result.ok ? "success" : "danger"} role={result.ok ? "status" : "alert"}>
          {result.text}
        </Alert>
      )}
    </form>
  );
}
