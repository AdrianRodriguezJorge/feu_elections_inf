import type { Route } from "next";
import type { UserRole } from "@/domain/types";

/** Rutas de la aplicación y quién puede entrar en cada una (F7). */
export const ROUTES = {
  votar: { href: "/votar", label: "Mi boleta", roles: ["VOTER", "COMMISSION"] as UserRole[] },
  comision: { href: "/comision", label: "Comisión", roles: ["ADMIN", "COMMISSION"] as UserRole[] },
  resultados: { href: "/resultados", label: "Resultados", roles: ["ADMIN", "COMMISSION", "OBSERVER", "VOTER"] as UserRole[] },
  observacion: { href: "/observacion", label: "Observación", roles: ["ADMIN", "COMMISSION", "OBSERVER"] as UserRole[] },
  reglamento: { href: "/reglamento", label: "Reglamento", roles: ["ADMIN", "COMMISSION", "OBSERVER", "VOTER"] as UserRole[] },
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Página de inicio de cada rol tras iniciar sesión. */
export function landingFor(role: UserRole): Route {
  if (role === "ADMIN" || role === "COMMISSION") return ROUTES.comision.href;
  if (role === "OBSERVER") return ROUTES.observacion.href;
  return ROUTES.votar.href;
}
