/**
 * Blindaje WORM y seed (F3): con votos en la urna, la base de datos impide
 * modificar o borrar boletas, selecciones, participaciones y auditoría, y el
 * seed se niega a reiniciar.
 */

import { execSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { activate, authorities, client, db, resetDb, VOTER_PASSWORD, VOTERS } from "./helpers";

describe("WORM y seed con votos emitidos", () => {
  beforeAll(async () => {
    await resetDb();
    const { liz } = await authorities();
    await activate(VOTERS[0], VOTER_PASSWORD);
    const voter = client();
    await voter.login(VOTERS[0], VOTER_PASSWORD);
    await liz.post("/api/eleccion/estado", { action: "ABRIR" });
    const candidates = (await liz.json("/api/eleccion/estado")).body.candidates;
    const r = await voter.post("/api/voto/emitir", {
      selections: [{ processCandidateId: candidates[0].candidateId, member: true, president: true }],
    });
    expect(r.status).toBe(200);
  });

  it("la boleta se guarda sin hora exacta, sin secuencia y con id aleatorio", async () => {
    const [ballot] = await db().$queryRaw<Array<{ id: string; castAt: Date }>>`SELECT id, "castAt" FROM ballots`;
    expect(ballot!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(ballot!.castAt.toISOString()).toMatch(/T00:00:00\.000Z$/);
  });

  it.each([
    ["UPDATE ballot_selections", `UPDATE "ballot_selections" SET "president" = false`],
    ["UPDATE ballots", `UPDATE "ballots" SET "state" = 'ANULADA_POR_ELECTOR'`],
    ["DELETE participations", `DELETE FROM "participations"`],
    ["UPDATE audit_events", `UPDATE "audit_events" SET "details" = '{}'`],
    ["TRUNCATE ballots", `TRUNCATE "ballots" CASCADE`],
    ["TRUNCATE audit_events", `TRUNCATE "audit_events"`],
  ])("la base bloquea %s", async (_label, sql) => {
    await expect(db().$executeRawUnsafe(sql)).rejects.toThrow(/WORM/);
  });

  it("la boleta sigue en la urna", async () => {
    expect(await db().ballot.count()).toBe(1);
  });

  it("el seed se niega a reiniciar una elección con votos", () => {
    expect(() => execSync("npx tsx prisma/seed.ts", { stdio: "pipe" })).toThrow();
  });
});
