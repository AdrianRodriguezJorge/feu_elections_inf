"use client";

import Image from "next/image";
import { BookOpen, Vote, BarChart3, Eye, Landmark, LogOut, type LucideIcon } from "lucide-react";
import type { SessionUser } from "@/lib/session-user";
import { RESULTS_PUBLIC_STATUSES } from "@/domain/states";
import type { ProcessStatus } from "@/domain/types";
import { STATUS_COLORS, statusLabel } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

export type ActiveTab = "VOTACION" | "ADMIN" | "RESULTADOS" | "REGLAMENTO" | "OBSERVADOR";

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  status: string;
  totalVotes: number;
  totalEligible: number;
  currentUser: SessionUser;
  onLogout: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: LucideIcon;
}

const ROLE_STYLES: Record<string, { label: string; badge: string }> = {
  ADMIN: { label: "Administración", badge: "bg-purple-100 text-purple-900 border-purple-200" },
  COMMISSION: { label: "Comisión", badge: "bg-sky-100 text-sky-900 border-sky-200" },
  VOTER: { label: "Elector", badge: "bg-cujae-green-50 text-cujae-green-700 border-cujae-green-100" },
  OBSERVER: { label: "Observador", badge: "bg-amber-100 text-amber-900 border-amber-300" },
};

/** Pestañas autorizadas según el rol: no se muestra lo que el usuario no puede hacer. */
function navItemsFor(role: SessionUser["role"], status: string): NavItem[] {
  if (role === "VOTER") {
    const items: NavItem[] = [
      { id: "VOTACION", label: "Mi Boleta", icon: Vote },
      { id: "REGLAMENTO", label: "Reglamento", icon: BookOpen },
    ];
    if (RESULTS_PUBLIC_STATUSES.includes(status as ProcessStatus) || status === "SIN_QUORUM") {
      items.push({ id: "RESULTADOS", label: "Escrutinio", icon: BarChart3 });
    }
    return items;
  }
  if (role === "OBSERVER") {
    const items: NavItem[] = [
      { id: "OBSERVADOR", label: "Observación", icon: Eye },
      { id: "REGLAMENTO", label: "Reglamento", icon: BookOpen },
    ];
    if (status !== "ABIERTA" && status !== "CONVOCADO") {
      items.push({ id: "RESULTADOS", label: "Escrutinio", icon: BarChart3 });
    }
    items.push({ id: "VOTACION", label: "Mi Boleta", icon: Vote });
    return items;
  }
  return [
    { id: "ADMIN", label: "Administración", icon: Landmark },
    { id: "RESULTADOS", label: "Escrutinio", icon: BarChart3 },
    { id: "OBSERVADOR", label: "Observación", icon: Eye },
    { id: "REGLAMENTO", label: "Reglamento", icon: BookOpen },
    { id: "VOTACION", label: "Mi Boleta", icon: Vote },
  ];
}

export function Header({ activeTab, onTabChange, status, totalVotes, totalEligible, currentUser, onLogout }: HeaderProps) {
  const navItems = navItemsFor(currentUser.role, status);
  const showTurnout = currentUser.role !== "VOTER";
  const roleStyle = ROLE_STYLES[currentUser.role];
  const displayName = currentUser.name || currentUser.ci;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-xs backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
              <Image src="/logos/cujae_rgba.png" alt="Logo CUJAE" fill sizes="48px" className="object-contain" priority />
            </div>
            <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
              <Image src="/logos/feu_512.png" alt="Logo FEU" fill sizes="48px" className="object-contain" priority />
            </div>
            <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
              <Image
                src="/logos/informatica_512.png"
                alt="Logo Facultad de Ingeniería Informática"
                fill
                sizes="48px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="hidden h-8 w-px bg-gray-200 sm:block" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-sm font-bold tracking-tight text-gray-900 sm:text-lg">
                Facultad de Ingeniería Informática
              </h1>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  STATUS_COLORS[status] ?? "bg-gray-700 text-white",
                )}
              >
                {statusLabel(status)}
              </span>
            </div>
            <p className="truncate text-xs text-gray-700 sm:text-sm">
              Elección del Secretariado
              {showTurnout && (
                <>
                  {" "}
                  · Han votado <strong className="text-gray-900">{totalVotes} de {totalEligible}</strong> electores
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
          <nav aria-label="Secciones" className="min-w-0">
            <ul className="flex flex-wrap items-center gap-1">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                        active ? "bg-cujae-green-500 text-white shadow-xs" : "bg-gray-100 text-gray-800 hover:bg-gray-200",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex min-w-0 shrink-0 items-center gap-1.5 border-l border-gray-200 pl-2">
            <div
              className="flex min-w-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs"
              title={`Sesión iniciada como ${displayName}`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-cujae-green-500" aria-hidden="true" />
              <span className="max-w-[130px] truncate font-semibold text-gray-900">{displayName}</span>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-xs font-bold",
                  roleStyle?.badge ?? "border-gray-200 bg-gray-100 text-gray-800",
                )}
              >
                {roleStyle?.label ?? "Usuario"}
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-transparent text-gray-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-800"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
