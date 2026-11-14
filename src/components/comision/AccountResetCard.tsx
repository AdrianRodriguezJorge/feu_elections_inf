"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { ActionResult, labelCls, type ActionMessage } from "./shared";

/** Restablece la activación de la cuenta de un elector (antes de abrir la votación). */
export function AccountResetCard() {
  const confirm = useConfirm();
  const [resetCi, setResetCi] = useState("");
  const [resetMsg, setResetMsg] = useState<ActionMessage | null>(null);

  const handleResetAccount = async () => {
    setResetMsg(null);
    if (!/^\d{11}$/.test(resetCi.trim())) {
      setResetMsg({ ok: false, text: "El carné de identidad debe tener 11 dígitos." });
      return;
    }
    const ok = await confirm({
      title: "¿Restablecer la cuenta?",
      description: `La cuenta del carné ${resetCi.trim()} quedará sin activar y el elector tendrá que activarla de nuevo.`,
      confirmLabel: "Restablecer cuenta",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/cuenta/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ci: resetCi.trim() }),
      });
      const data = await res.json();
      setResetMsg({ ok: res.ok, text: res.ok ? data.message : data.error || "No se pudo restablecer la cuenta." });
      if (res.ok) setResetCi("");
    } catch {
      setResetMsg({ ok: false, text: "No se pudo conectar con el servidor. Inténtelo de nuevo." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restablecer la cuenta de un elector</CardTitle>
        <CardDescription>
          Utilícelo si un elector informa de que otra persona activó su cuenta. Solo es posible antes de abrir la votación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="reset-ci" className={labelCls}>
              Carné de identidad del elector
            </label>
            <Input
              id="reset-ci"
              inputMode="numeric"
              maxLength={11}
              value={resetCi}
              onChange={(e) => setResetCi(e.target.value.replace(/\D/g, ""))}
              placeholder="11 dígitos"
              className="rounded-md font-mono text-sm"
            />
          </div>
          <Button onClick={handleResetAccount}>Restablecer cuenta</Button>
        </div>
        <ActionResult msg={resetMsg} />
      </CardContent>
    </Card>
  );
}
