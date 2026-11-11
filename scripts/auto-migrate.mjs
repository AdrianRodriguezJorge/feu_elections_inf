import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("[AUTO-MIGRATE] No DATABASE_URL defined, skipping database migration.");
    return;
  }

  console.log("[AUTO-MIGRATE] Sincronizando esquema de base de datos (prisma db push)...");
  try {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  } catch (err) {
    console.warn("[AUTO-MIGRATE] Aviso: prisma db push no pudo conectar:", err.message);
    return;
  }

  // Verificar si la base de datos es virgen para sembrarla automáticamente
  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("[AUTO-MIGRATE] Base de datos vacía (0 usuarios). Ejecutando sembrado inicial...");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
      console.log("[AUTO-MIGRATE] Sembrado completado exitosamente.");
    } else {
      console.log(`[AUTO-MIGRATE] Base de datos ya inicializada (${userCount} usuarios detectados). Se preservan los datos existentes.`);
    }
  } catch (err) {
    console.warn("[AUTO-MIGRATE] No se pudo verificar/sembrar la base de datos:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.warn("[AUTO-MIGRATE] Error inesperado en auto-migrate:", err);
});
