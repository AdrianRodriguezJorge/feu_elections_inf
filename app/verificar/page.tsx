import { PublicShell } from "@/views/PublicShell";
import { VerifyReceipt } from "@/views/VerifyReceipt";

export const metadata = { title: "Verificar comprobante · Elecciones FEU" };

/** Verificación pública de comprobantes: solo confirma que la boleta está en la urna. */
export default function VerificarPage() {
  return (
    <PublicShell title="Verificar comprobante">
      <VerifyReceipt />
    </PublicShell>
  );
}
