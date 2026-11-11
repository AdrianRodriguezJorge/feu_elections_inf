import { prisma } from "../src/server/db";

async function main() {
  console.log("=== Comprobando Blindaje WORM de PostgreSQL ===");
  const ballot = await prisma.ballot.findFirst();
  if (!ballot) {
    console.log("No ballot to test.");
    return;
  }

  // 1. Probar UPDATE sobre boleta
  try {
    await prisma.ballot.update({
      where: { id: ballot.id },
      data: { state: "ANULADA_POR_ELECTOR" },
    });
    console.error("FALLO: Se permitió modificar una boleta en PostgreSQL!");
  } catch (err: any) {
    console.log("ÉXITO: PostgreSQL bloqueó el UPDATE de boleta:", err.message.split("\n").slice(-1)[0]);
  }

  // 2. Probar DELETE sobre boleta
  try {
    await prisma.ballot.delete({
      where: { id: ballot.id },
    });
    console.error("FALLO: Se permitió eliminar una boleta en PostgreSQL!");
  } catch (err: any) {
    console.log("ÉXITO: PostgreSQL bloqueó el DELETE de boleta:", err.message.split("\n").slice(-1)[0]);
  }

  // 3. Probar UPDATE sobre evento de auditoría
  const audit = await prisma.auditEvent.findFirst();
  if (audit) {
    try {
      await prisma.auditEvent.update({
        where: { id: audit.id },
        data: { action: "MODIFICADO_ILEGALMENTE" },
      });
      console.error("FALLO: Se permitió modificar un evento de auditoría en PostgreSQL!");
    } catch (err: any) {
      console.log("ÉXITO: PostgreSQL bloqueó el UPDATE de auditoría:", err.message.split("\n").slice(-1)[0]);
    }
  }
}

main().finally(() => prisma.$disconnect());

