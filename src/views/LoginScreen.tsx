"use client";

import Link from "next/link";
import { LoginCard } from "@/components/LoginCard";
import { Footer } from "@/components/Footer";

/** Pantalla de inicio sin sesión: acceso, reglamento y verificación pública. */
export function LoginScreen() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-paper text-ink-900">
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-6">
        <LoginCard onLoginSuccess={() => window.location.assign("/")} />
        <nav aria-label="Consultas públicas" className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
          <Link href="/verificar" className="inline-flex min-h-11 items-center font-semibold text-action underline">
            Verificar un comprobante
          </Link>
          <Link href="/reglamento" className="inline-flex min-h-11 items-center font-semibold text-action underline">
            Consultar el reglamento
          </Link>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
