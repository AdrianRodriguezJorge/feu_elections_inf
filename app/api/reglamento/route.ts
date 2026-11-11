import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import seedData from "@/../prisma/regulation.seed.json";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const articleParam = searchParams.get("article");
  const queryParam = searchParams.get("q")?.toLowerCase();

  try {
    // Intentar leer de la base de datos si está poblada
    const dbArticles = await prisma.regulationArticle.findMany({
      where: {
        ...(articleParam ? { article: articleParam } : {}),
        ...(queryParam
          ? {
              literalText: {
                contains: queryParam,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: { page: "asc" },
      take: 50,
    });

    if (dbArticles.length > 0) {
      return NextResponse.json({
        source: "database",
        count: dbArticles.length,
        articles: dbArticles,
      });
    }
  } catch {
    // Si la base de datos no está disponible, fallback al seed JSON
  }

  // Fallback a regulation.seed.json
  let articles = seedData.articles;

  if (articleParam) {
    articles = articles.filter((a) => a.article === articleParam);
  }

  if (queryParam) {
    articles = articles.filter((a) =>
      a.literalText.toLowerCase().includes(queryParam),
    );
  }

  return NextResponse.json({
    source: "seed-json",
    document: seedData.document,
    part: seedData.part,
    count: articles.length,
    articles: articles.slice(0, 50),
  });
}

