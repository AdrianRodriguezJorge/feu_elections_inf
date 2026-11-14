"use client";

import * as React from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

/**
 * Confirmaciones accesibles que sustituyen a `window.confirm`.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "¿Cerrar la votación?", description: "...", confirmLabel: "Cerrar votación" })) ...
 *
 * El botón de confirmación nombra la acción, nunca "Aceptar".
 */
export interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Resolver = (value: boolean) => void;
const ConfirmContext = React.createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<Resolver | null>(null);

  const confirm = React.useCallback((o: ConfirmOptions) => {
    setOptions(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={options !== null} onOpenChange={(open) => !open && close(false)}>
        {options && (
          <DialogContent hideClose role="alertdialog">
            <DialogHeader>
              <DialogTitle>{options.title}</DialogTitle>
              <DialogDescription>{options.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => close(false)}>
                {options.cancelLabel ?? "Cancelar"}
              </Button>
              <Button variant={options.danger ? "danger" : "primary"} onClick={() => close(true)}>
                {options.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>.");
  return ctx;
}
