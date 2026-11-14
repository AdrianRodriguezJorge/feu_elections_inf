import { ROUTES } from "@/lib/routes";
import { requirePageRole } from "@/server/page-guard";
import { ResultadosView } from "@/views/ResultadosView";

export const metadata = { title: `${ROUTES.resultados.label} · Elecciones FEU` };

export default async function Page() {
  await requirePageRole(ROUTES.resultados.roles);
  return <ResultadosView />;
}
