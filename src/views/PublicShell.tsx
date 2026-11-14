import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";

/** Estructura de las páginas públicas (sin sesión). */
export function PublicShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink-900">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <p className="font-bold">
            {title} · <span className="text-feu-carmesi-500">FEU</span> Ingeniería Informática
          </p>
          <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-action">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Iniciar sesión
          </Link>
        </div>
      </header>
      <main id="contenido" className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
