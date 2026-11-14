import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { UserRole } from "@/domain/types";
import type { SessionUser } from "@/lib/session-user";
import { landingFor } from "@/lib/routes";

/**
 * Protección de páginas en el servidor: sin sesión vuelve al inicio; con un rol
 * no autorizado, a la página de su rol.
 */
export async function requirePageRole(roles: readonly UserRole[]): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.ci || !user.role) redirect("/");
  if (!roles.includes(user.role)) redirect(landingFor(user.role));
  return user;
}
