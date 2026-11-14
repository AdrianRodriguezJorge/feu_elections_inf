"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Vote, BarChart3, Eye, Landmark, LogOut, type LucideIcon } from "lucide-react";
import type { SessionUser } from "@/lib/session-user";
import { RESULTS_PUBLIC_STATUSES } from "@/domain/states";
import type { ProcessStatus } from "@/domain/types";
import { ROUTES, type RouteKey } from "@/lib/routes";
import { STATUS_COLORS, statusLabel } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

interface HeaderProps {
  status: string;
  totalVotes: number;
  totalEligible: number;
  currentUser: SessionUser;
  onLogout: () => void;
}

const ICONS: Record<RouteKey, LucideIcon> = {
  votar: Vote,
  comision: Landmark,
  resultados: BarChart3,
  observacion: Eye,
  reglamento: BookOpen,
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administración",
  COMMISSION: "Comisión",
  OBSERVER: "Observador",
  VOTER: "Elector",
};

/** Cabecera con navegación por rol (enlaces reales del App Router). */
export function Header({ status, totalVotes, totalEligible, currentUser, onLogout }: HeaderProps) {
  const pathname = usePathname();
  const role = currentUser.role;
  const resultsPublic = RESULTS_PUBLIC_STATUSES.includes(status as ProcessStatus) || status === "SIN_QUORUM";

  const items = (Object.keys(ROUTES) as RouteKey[]).filter((key) => {
    if (!ROUTES[key].roles.includes(role)) return false;
    if (key === "resultados" && role === "VOTER" && !resultsPublic) return false;
    return true;
  });
  const showTurnout = role !== "VOTER";

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <Image src="/logos/cujae_rgba.png" alt="CUJAE" width={28} height={28} />
            <Image src="/logos/feu_512.png" alt="FEU" width={28} height={28} />
            <Image src="/logos/informatica_512.png" alt="Facultad de Ingeniería Informática" width={28} height={28} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-ink-900 sm:text-base">Facultad de Ingeniería Informática</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-600">
              <span>
                Elección del Secretariado de la <span className="font-bold text-feu-carmesi-500">FEU</span>
              </span>
              {status && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", STATUS_COLORS[status] ?? "bg-paper-200 text-ink-800")}>
                  {statusLabel(status)}
                </span>
              )}
              {showTurnout && totalEligible > 0 && (
                <span>
                  Han votado {totalVotes} de {totalEligible}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <nav aria-label="Secciones" className="flex min-w-0 flex-wrap gap-1">
            {items.map((key) => {
              const Icon = ICONS[key];
              const active = pathname === ROUTES[key].href;
              return (
                <Link
                  key={key}
                  href={ROUTES[key].href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-md border-b-2 px-3 text-sm font-semibold",
                    active
                      ? "border-action bg-action-50 text-action"
                      : "border-transparent text-ink-700 hover:bg-paper-200 hover:text-ink-900",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {ROUTES[key].label}
                </Link>
              );
            })}
          </nav>
          <span className="inline-flex min-h-11 min-w-0 items-center gap-2 border-l border-line pl-3 text-sm text-ink-800">
            <span className="truncate">{currentUser.name}</span>
            <span className="shrink-0 text-xs font-semibold text-ink-600">{ROLE_LABELS[role] ?? role}</span>
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line text-ink-700 hover:bg-paper-200"
          >
            <LogOut className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
