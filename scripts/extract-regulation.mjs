#!/usr/bin/env node
/**
 * Extrae el texto literal de los artículos del Reglamento de la FEU desde el
 * texto extraído de `ABC-FEU-2019.pdf` y genera `prisma/regulation.seed.json`.
 *
 * Uso:
 *   node scripts/extract-regulation.mjs "<ruta>\abc-feu-2019.txt" [--part REGLAMENTO]
 *
 * El PDF es la única fuente autorizada: el texto literal no se reescribe ni se
 * parafrasea. La página se toma de los marcadores `===== PAGINA N =====` del
 * propio texto extraído.
 *
 * El PDF contiene tres documentos que reinician la numeración de artículos:
 *   - DECLARACION_FINAL (arts. 1-…)
 *   - ESTATUTOS (arts. 1-…)
 *   - REGLAMENTO (arts. 1-…)  ← el que nos aplica
 * Por eso cada artículo se identifica por el par (parte, artículo).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "..", "prisma", "regulation.seed.json");

const ARTICLE_RE = /^Artículo\s+(\d+[A-Za-z]?)\s*:\s*(.*)$/;
const PAGE_RE = /^=+\s*PAGINA\s+(\d+)\s*=+\s*$/i;

/**
 * Detecta en qué parte del documento está una línea.
 *
 * @param {string} line
 * @param {string} current parte vigente
 */
function detectPart(line, current) {
  const s = line.trim();
  if (/^Estatutos\s*$/i.test(s)) return "ESTATUTOS";
  if (/^Regla-?men(t|to)?\s*$/i.test(s)) return "REGLAMENTO";
  return current;
}

/**
 * Extrae los artículos del texto, con parte, página y literal.
 *
 * @param {string} text
 */
export function extractArticles(text) {
  const lines = text.split(/\r?\n/);
  const articles = [];
  let current = null;
  let part = "DECLARACION_FINAL";
  let page = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    const pageMatch = line.match(PAGE_RE);
    if (pageMatch) {
      page = Number(pageMatch[1]);
      continue;
    }

    const detected = detectPart(line, part);
    if (detected !== part) {
      if (current) {
        articles.push(current);
        current = null;
      }
      part = detected;
    }

    const match = line.match(ARTICLE_RE);
    if (match) {
      if (current) articles.push(current);
      current = {
        part,
        article: match[1],
        page,
        paragraphs: [match[2].trim()],
      };
      continue;
    }

    if (current) {
      if (line.trim() === "") {
        if (current.paragraphs.at(-1) !== "") current.paragraphs.push("");
        continue;
      }
      if (current.paragraphs.at(-1) === "") current.paragraphs.pop();
      current.paragraphs[current.paragraphs.length - 1] += " " + line.trim();
    }
  }
  if (current) articles.push(current);

  return articles
    .map((a) => ({
      part: a.part,
      article: a.article,
      page: a.page,
      literalText: a.paragraphs
        .join("\n")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    }))
    .filter((a) => a.literalText.length > 0);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Uso: node scripts/extract-regulation.mjs <ruta-del-texto> [--part PARTE] [--articles 1,2,3]",
    );
    process.exit(1);
  }

  const inputPath = args[0];
  let part = null;
  let wanted = null;

  for (let i = 1; i < args.length; i += 1) {
    if (args[i] === "--part") {
      part = args[i + 1];
      i += 1;
    } else if (args[i] === "--articles") {
      wanted = args[i + 1].split(",").map((s) => s.trim());
      i += 1;
    }
  }

  const text = readFileSync(inputPath, "utf8");
  let articles = extractArticles(text);

  if (part) articles = articles.filter((a) => a.part === part);
  if (wanted) articles = articles.filter((a) => wanted.includes(a.article));

  writeFileSync(
    OUTPUT,
    JSON.stringify(
      {
        document: "ABC-FEU-2019.pdf",
        part: part ?? "ALL",
        articleCount: articles.length,
        articles,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(
    `Escritos ${articles.length} artículos en ${OUTPUT}\n` +
      articles.map((a) => `  ${a.part} Art. ${a.article} (p. ${a.page ?? "?"})`).join("\n"),
  );
}

if (process.argv[1] && process.argv[1].endsWith("extract-regulation.mjs")) {
  main();
}
