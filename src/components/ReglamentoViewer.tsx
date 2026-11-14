"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, X } from "lucide-react";

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
    label: "Convocatoria y Participación (>85 %)",
    filter: (a: ArticleItem) => ["36", "37", "38", "39", "40"].includes(a.article),
  },
  {
    label: "Comisión Electoral",
    filter: (a: ArticleItem) => ["41", "42", "43", "44", "45", "46", "47", "48"].includes(a.article),
  },
  {
    label: "Boleta, Escaños y Votación",
    filter: (a: ArticleItem) => ["58", "59", "60", "61", "62", "63", "64", "65", "66"].includes(a.article),
  },
  {
    label: "Vicepresidencia y Vacantes",
    filter: (a: ArticleItem) => ["67", "68", "99", "100", "101", "102"].includes(a.article),
  },
  {
    label: "Reclamaciones y Plazos",
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Encabezado del Marco Normativo */}
      <div className="rounded-xl border border-feu-green-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-feu-green-900">
              Reglamento General de la <span className="text-feu-carmesi-500">FEU</span> (ABC 2019)
            </h2>
            <p className="mt-1 text-sm text-gray-700">
              Texto literal de los {articles.length} artículos, con la página del documento original <strong>{docName}</strong>.
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-feu-green-100 px-3 py-1 text-xs font-bold text-feu-green-900">
              {filteredArticles.length} {filteredArticles.length === 1 ? "artículo" : "artículos"}
            </span>
          </div>
        </div>

        {/* Buscador reactivo */}
        <div className="mt-5">
          <label htmlFor="reglamento-search" className="mb-1 block text-sm font-semibold text-gray-800">
            Buscar en el reglamento
          </label>
          <div className="relative">
            <input
              id="reglamento-search"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(24);
              }}
              placeholder="Número de artículo (por ejemplo, 38) o palabra clave (por ejemplo, empate)"
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 pr-24 text-sm text-gray-900 shadow-2xs focus:border-cujae-green-500 focus:outline-hidden"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-600" strokeWidth={2} aria-hidden="true" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1 top-0.5 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span>Borrar búsqueda</span>
              </button>
            )}
          </div>
        </div>

        {/* Píldoras de Filtro Rápido */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.label}
              type="button"
              aria-pressed={selectedCategory === idx}
              onClick={() => {
                setSelectedCategory(idx);
                setVisibleCount(24);
              }}
              className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                selectedCategory === idx
                  ? "bg-cujae-green-500 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Artículos */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-feu-green-700 border-r-transparent" />
          <p role="status" className="mt-3 text-sm text-gray-700">Cargando el reglamento…</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-xs">
          <p className="text-sm font-semibold text-gray-800">No se encontraron artículos con ese criterio.</p>
          <p className="mt-1 text-sm text-gray-700">Pruebe con otro número de artículo o con una palabra más general.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory(0);
            }}
            className="mt-4 min-h-11 rounded-lg bg-cujae-green-500 px-4 py-2 text-sm font-bold text-white hover:bg-cujae-green-700"
          >
            Ver todos los artículos
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredArticles.slice(0, visibleCount).map((item) => (
              <div
                key={`${item.part}-${item.article}`}
                className="flex flex-col justify-between rounded-xl border border-feu-green-200 bg-white p-5 shadow-2xs hover:border-feu-green-400 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-cujae-green-500 text-white text-xs font-bold">
                        §
                      </span>
                      <span className="font-bold text-sm text-feu-green-900">
                        Artículo {item.article}
                      </span>
                    </div>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      Pág. {item.page}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-gray-800">
                    «{item.literalText}»
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-gray-50 flex items-center justify-between gap-2 text-xs text-gray-600">
                  <span>{item.part}</span>
                  <span>{docName}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Botón Cargar Más si hay más artículos */}
          {visibleCount < filteredArticles.length && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="min-h-11 rounded-lg border border-feu-green-300 bg-white px-6 py-2.5 text-sm font-bold text-feu-green-800 shadow-2xs hover:bg-feu-green-50"
              >
                Cargar más artículos ({filteredArticles.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
