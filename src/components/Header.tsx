"use client";

import Image from "next/image";
import {
  Key,
  BookOpen,
  Search,
  Vote,
  BarChart3,
  Eye,
  Landmark,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import type { SessionUser } from "@/lib/session-user";

export type ActiveTab =
  | "LOGIN"
  | "VOTACION"
  | "ADMIN"
  | "RESULTADOS"
  | "REGLAMENTO"
  | "OBSERVADOR"
  | "VERIFICAR";

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  status: string;
  totalVotes: number;
  totalEligible: number;
  currentUser?: SessionUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export function Header({
  activeTab,
  onTabChange,
  status,
  totalVotes,
  totalEligible,
  currentUser,
  onOpenAuth,
  onLogout,
}: HeaderProps) {
  const statusColor: Record<string, string> = {
    ABIERTA: "bg-emerald-600 text-white",
    CERRADA: "bg-amber-600 text-white",
    ESCRUTADA: "bg-blue-600 text-white",
    PROCLAMADA: "bg-purple-600 text-white",
    VP_DESIGNADA: "bg-indigo-600 text-white",
    BORRADOR: "bg-gray-600 text-white",
  };

  const roleStyles: Record<string, { label: string; badge: string }> = {
    ADMIN: {
      label: "ADMIN",
      badge: "bg-purple-100 text-purple-900 border-purple-200",
    },
    COMMISSION: {
      label: "COMISIÓN",
      badge: "bg-sky-100 text-sky-900 border-sky-200",
    },
    VOTER: {
      label: "ELECTOR",
      badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
    },
    OBSERVER: {
      label: "OBSERVADOR",
      badge: "bg-amber-100 text-amber-900 border-amber-300",
    },
  };

  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: LucideIcon;
  }

  // Principio de diseño: "No mostrar al usuario lo que no puede hacer"
  const getAuthorizedNavItems = (): NavItem[] => {
    if (!currentUser) {
      return [
        { id: "LOGIN", label: "Acceso al Sistema", icon: Key },
        { id: "REGLAMENTO", label: "Reglamento", icon: BookOpen },
        { id: "VERIFICAR", label: "Verificar Boleta", icon: Search },
      ];
    }

    if (currentUser.role === "VOTER") {
      const items: NavItem[] = [
        { id: "VOTACION", label: "Mi Boleta", icon: Vote },
        { id: "REGLAMENTO", label: "Reglamento", icon: BookOpen },
      ];
      if (["PROCLAMADA", "VP_DESIGNADA", "FINALIZADA"].includes(status)) {
        items.push({ id: "RESULTADOS", label: "Resultados Oficiales", icon: BarChart3 });
      }
      return items;
    }

    if (currentUser.role === "OBSERVER") {
      const items: NavItem[] = [
        { id: "OBSERVADOR", label: "Observación", icon: Eye },
        { id: "REGLAMENTO", label: "Reglamento", icon: BookOpen },
      ];
      if (status !== "ABIERTA" && status !== "BORRADOR") {
        items.push({ id: "RESULTADOS", label: "Escrutinio", icon: BarChart3 });
      }
      items.push({ id: "VOTACION", label: "Mi Boleta", icon: Vote });
      return items;
    }

    // ADMIN y COMMISSION
    return [
      { id: "ADMIN", label: "Administración", icon: Landmark },
      { id: "RESULTADOS", label: "Escrutinio", icon: BarChart3 },
      { id: "OBSERVADOR", label: "Observación", icon: Eye },
      { id: "REGLAMENTO", label: "Reglamento", icon: BookOpen },
      { id: "VOTACION", label: "Mi Boleta", icon: Vote },
    ];
  };

  const navItems = getAuthorizedNavItems();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Identidad Institucional con los 3 logos oficiales */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Logo CUJAE */}
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0">
              <Image
                src="/logos/cujae_rgba.png"
                alt="Logo CUJAE"
                fill
                sizes="48px"
                className="object-contain"
                priority
              />
            </div>

            {/* Logo FEU Oficial */}
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0">
              <Image
                src="/logos/feu_512.png"
                alt="Logo FEU"
                fill
                sizes="48px"
                className="object-contain"
                priority
              />
            </div>

            {/* Logo Facultad de Informática (Amarillo distintivo) */}
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0">
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

          <div className="h-8 w-px bg-gray-200 hidden sm:block" />

          {/* Textos Institucionales */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-gray-900 truncate">
                Facultad de Ingeniería Informática
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold shrink-0 ${
                  statusColor[status] ?? "bg-gray-600 text-white"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-600 truncate">
              Elección del Secretariado · Sufragio:{" "}
              <strong className="text-gray-900">
                {totalVotes} de {totalEligible}
              </strong>{" "}
              electores
            </p>
          </div>
        </div>

        {/* Barra de Navegación Estricta por Roles */}
        <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
          <nav className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === item.id
                    ? "bg-[#136D54] text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Estado de Autenticación / Perfil */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-gray-200">
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs shadow-2xs"
                  title={`Conectado como ${currentUser.name || currentUser.ci}`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-gray-800 truncate max-w-[130px]">
                    {currentUser.name || currentUser.ci}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                      roleStyles[currentUser.role]?.badge || "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {roleStyles[currentUser.role]?.label || currentUser.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg p-1.5 text-xs text-gray-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                  aria-label="Cerrar Sesión"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (onOpenAuth ? onOpenAuth() : onTabChange("LOGIN"))}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer ${
                  activeTab === "LOGIN"
                    ? "bg-[#136D54] text-white"
                    : "bg-emerald-50 text-[#136D54] hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                <Key className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
