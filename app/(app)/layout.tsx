import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { ElectionProvider } from "@/components/ElectionProvider";

/** Área autenticada: sin sesión válida vuelve al inicio (comprobación en el servidor). */
export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const user = session?.user;
  if (!user?.ci || !user.role) redirect("/");
  return (
    <ElectionProvider user={user}>
      <AppShell>{children}</AppShell>
    </ElectionProvider>
  );
}
