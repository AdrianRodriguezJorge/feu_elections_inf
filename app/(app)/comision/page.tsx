import { ROUTES } from "@/lib/routes";
import { requirePageRole } from "@/server/page-guard";
import { ComisionView } from "@/views/ComisionView";

export const metadata = { title: `${ROUTES.comision.label} · Elecciones FEU` };

export default async function Page() {
  await requirePageRole(ROUTES.comision.roles);
  return <ComisionView />;
}
