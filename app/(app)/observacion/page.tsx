import { ROUTES } from "@/lib/routes";
import { requirePageRole } from "@/server/page-guard";
import { ObservacionView } from "@/views/ObservacionView";

export const metadata = { title: `${ROUTES.observacion.label} · Elecciones FEU` };

export default async function Page() {
  await requirePageRole(ROUTES.observacion.roles);
  return <ObservacionView />;
}
