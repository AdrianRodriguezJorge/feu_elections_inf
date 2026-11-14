import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { ElectionProvider } from "@/components/ElectionProvider";
import { ReglamentoViewer } from "@/components/ReglamentoViewer";
import { PublicShell } from "@/views/PublicShell";

export const metadata = { title: "Reglamento · Elecciones FEU" };

/** Reglamento: público; con sesión se muestra dentro de la navegación del usuario. */
export default async function ReglamentoPage() {
  const session = await auth();
  const user = session?.user;
  if (user?.ci && user.role) {
    return (
      <ElectionProvider user={user}>
        <AppShell>
          <ReglamentoViewer />
        </AppShell>
      </ElectionProvider>
    );
  }
  return (
    <PublicShell title="Reglamento">
      <ReglamentoViewer />
    </PublicShell>
  );
}
