"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ArticleItem {
  part: string;
  article: string;
  page: number;
  literalText: string;
  sourceDoc?: string;
  appliesTo?: string[];
}

const CATEGORIES = [
  { label: "Todos los artículos", filter: () => true },
  {
    label: "Convocatoria y participación (>85 %)",
    filter: (a: ArticleItem) => ["36", "37", "38", "39", "40"].includes(a.article),
  },
  {
    label: "Comisión Electoral",
    filter: (a: ArticleItem) => ["41", "42", "43", "44", "45", "46", "47", "48"].includes(a.article),
  },
  {
    label: "Boleta, escaños y votación",
    filter: (a: ArticleItem) => ["58", "59", "60", "61", "62", "63", "64", "65", "66"].includes(a.article),
  },
  {
    label: "Vicepresidencia y vacantes",
    filter: (a: ArticleItem) => ["67", "68", "99", "100", "101", "102"].includes(a.article),
  },
  {
    label: "Reclamaciones y plazos",
    filter: (a: ArticleItem) => ["103", "104", "105", "106", "107", "108"].includes(a.article),
  },
];

export function ReglamentoViewer() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [docName, setDocName] = useState("ABC-FEU-2019.pdf");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch("/api/reglamento");
        const data = await res.json();
        if (data.articles) {
          setArticles(data.articles);
        }
        if (data.document) {
          setDocName(data.document);
        }
      } catch {
        // Fallback silencioso
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    const categoryFilter = CATEGORIES[selectedCategory]?.filter ?? (() => true);
    const q = search.trim().toLowerCase();

    return articles.filter((a) => {
      if (!categoryFilter(a)) return false;
      if (!q) return true;

      // Coincidencia por número exacto de artículo o texto
      const matchesNum = a.article.toLowerCase() === q || `artículo ${a.article}`.toLowerCase().includes(q) || `art ${a.article}`.toLowerCase().includes(q);
      const matchesText = a.literalText.toLowerCase().includes(q);
      return matchesNum || matchesText;
    });
  }, [articles, search, selectedCategory]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="border-b border-line-strong pb-6">
        <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
          Reglamento General de la <span className="text-feu-carmesi-500">FEU</span> (ABC 2019)
        </h2>
        <p className="mt-2 text-base text-ink-700">
          Texto literal de los {articles.length} artículos, con la página del documento original <strong>{docName}</strong>.
        </p>

        <div className="mt-6">
          <Label htmlFor="reglamento-search">Buscar en el reglamento</Label>
          <div className="relative mt-1.5">
            <Input
              id="reglamento-search"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(24);
              }}
              placeholder="Número de artículo (por ejemplo, 38) o palabra clave"
              className="pl-10 pr-36"
            />
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" strokeWidth={2} aria-hidden="true" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center gap-1 px-2 text-sm text-ink-700 hover:text-ink-900"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span>Borrar búsqueda</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por tema">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.label}
              type="button"
              aria-pressed={selectedCategory === idx}
              onClick={() => {
                setSelectedCategory(idx);
                setVisibleCount(24);
              }}
              className={cn(
                "min-h-11 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                selectedCategory === idx
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-line bg-white text-ink-800 hover:bg-paper-200",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-ink-600" role="status">
          {filteredArticles.length} {filteredArticles.length === 1 ? "artículo" : "artículos"}
        </p>
      </header>

      {loading ? (
        <p role="status" className="py-12 text-center text-base text-ink-700">
          Cargando el reglamento…
        </p>
      ) : filteredArticles.length === 0 ? (
        <div className="rounded-md border border-line bg-white p-8 text-center">
          <p className="text-base font-semibold text-ink-900">No se encontraron artículos con ese criterio.</p>
          <p className="mt-1 text-sm text-ink-700">Pruebe con otro número de artículo o con una palabra más general.</p>
          <Button
            className="mt-4"
            onClick={() => {
              setSearch("");
              setSelectedCategory(0);
            }}
          >
            Ver todos los artículos
          </Button>
        </div>
      ) : (
        <>
          <ol className="divide-y divide-line border-y border-line">
            {filteredArticles.slice(0, visibleCount).map((item) => (
              <li key={`${item.part}-${item.article}`} className="py-6">
                <article>
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-ink-900">Artículo {item.article}</h3>
                    <span className="text-sm text-ink-600">
                      {item.part} · pág. {item.page}
                    </span>
                  </header>
                  <p className="mt-2 font-serif text-base leading-relaxed text-ink-800">{item.literalText}</p>
                </article>
              </li>
            ))}
          </ol>

          {visibleCount < filteredArticles.length && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => setVisibleCount((prev) => prev + 24)}>
                Cargar más artículos ({filteredArticles.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
