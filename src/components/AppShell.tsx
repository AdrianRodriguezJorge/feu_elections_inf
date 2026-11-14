"use client";

import type { ReactNode } from "react";
import { signOut } from "next-auth/react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useElection } from "@/components/ElectionProvider";

/** Estructura común de las páginas autenticadas: cabecera con navegación por rol, contenido y pie. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, data } = useElection();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.assign("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink-900">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-bold"
      >
        Saltar al contenido
      </a>
      <Header
        status={data?.summary.status ?? ""}
        totalVotes={data?.summary.totalVotes ?? 0}
        totalEligible={data?.summary.totalEligible ?? 0}
        currentUser={user}
        onLogout={handleLogout}
      />
      <main id="contenido" className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
