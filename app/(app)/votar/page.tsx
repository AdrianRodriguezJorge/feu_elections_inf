import { ROUTES } from "@/lib/routes";
import { requirePageRole } from "@/server/page-guard";
import { VotarView } from "@/views/VotarView";

export const metadata = { title: `${ROUTES.votar.label} · Elecciones FEU` };

export default async function Page() {
  await requirePageRole(ROUTES.votar.roles);
  return <VotarView />;
}
