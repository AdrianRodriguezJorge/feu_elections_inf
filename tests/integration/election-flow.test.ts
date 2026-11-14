/**
 * Jornada electoral completa (F2): excepción de quórum, votación con >85 %,
 * empate en la presidencia resuelto por la Comisión con acta, escrutinio único,
 * VP, vacante presidencial, nuevo VP e integridad de la auditoría.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { activate, authorities, client, Client, resetDb, VOTER_PASSWORD, VOTERS } from "./helpers";

describe("Jornada electoral completa", () => {
  let admin: Client;
  let liz: Client;
  let revisor: Client;
  const voters: Client[] = [];
  let candidates: string[] = [];

  beforeAll(async () => {
    await resetDb();
    ({ admin, liz, revisor } = await authorities());
    for (const ci of VOTERS) {
      await activate(ci, VOTER_PASSWORD);
      const v = client();
      if ((await v.login(ci, VOTER_PASSWORD)) === null) voters.push(v);
    }
  });

  it("los 10 electores activan su cuenta y entran", () => {
    expect(voters).toHaveLength(10);
  });

  describe("excepción de quórum", () => {
    it("solo el Administrador y dentro de 80-85 %", async () => {
      expect((await liz.post("/api/eleccion/quorum", { pct: 80, justification: "Prueba de permisos", acta: "A-1" })).status).toBe(403);
      expect((await admin.post("/api/eleccion/quorum", { pct: 70, justification: "Fuera de rango legal", acta: "A-1" })).status).toBe(422);
    });

    it("queda visible para todos con su acta y se puede revertir", async () => {
      const ok = await admin.post("/api/eleccion/quorum", { pct: 80, justification: "Excepción aprobada por el Secretariado", acta: "Res. 12/2026" });
      expect(ok.status).toBe(200);
      const view = await voters[0]!.json("/api/eleccion/estado");
      expect(view.body.quorum.effectivePct).toBe(80);
      expect(view.body.quorum.exception.acta).toBe("Res. 12/2026");
      expect((await admin.post("/api/eleccion/quorum", { pct: 85, justification: "Se restablece la regla general", acta: "Res. 13/2026" })).status).toBe(200);
    });
  });

  describe("votación", () => {
    it("no se escruta antes de cerrar", async () => {
      expect((await liz.post("/api/escrutinio", {})).status).toBe(409);
    });

    it("12 de 13 electores votan; el Administrador no vota", async () => {
      expect((await liz.post("/api/eleccion/estado", { action: "ABRIR" })).status).toBe(200);
      candidates = (await liz.json("/api/eleccion/estado")).body.candidates.map((c: { candidateId: string }) => c.candidateId);
      const [p1, p2] = candidates;
      // Todos marcan a los 8 primeros (corte limpio); la presidencia se reparte 6 y 6 → empate.
      const ballotFor = (president: string) =>
        candidates.slice(0, 8).map((id) => ({ processCandidateId: id, member: true, president: id === president }));
      const everyone = [...voters, liz, revisor];
      let ok = 0;
      for (let i = 0; i < everyone.length; i++) {
        const r = await everyone[i]!.post("/api/voto/emitir", { selections: ballotFor(i % 2 === 0 ? p1! : p2!) });
        if (r.status === 200) ok++;
      }
      expect(ok).toBe(12);
      expect((await admin.post("/api/voto/emitir", { selections: ballotFor(p1!) })).status).toBe(403);
    });

    it("se cierra y no se reabre", async () => {
      expect((await liz.post("/api/eleccion/estado", { action: "CERRAR" })).status).toBe(200);
      expect((await liz.post("/api/eleccion/estado", { action: "ABRIR" })).status).toBe(409);
    });
  });

  describe("escrutinio y empate", () => {
    it("el escrutinio detecta el empate en la presidencia y no se repite", async () => {
      const r = await liz.post("/api/escrutinio", {});
      expect(r.status).toBe(200);
      expect(r.body.processStatus).toBe("EMPATE");
      expect(r.body.tally.tie.type).toBe("PRESIDENT");
      expect((await liz.post("/api/escrutinio", {})).status).toBe(409);
    });

    it("con el empate pendiente no hay resultados para el votante ni designación de VP", async () => {
      expect((await voters[0]!.json("/api/eleccion/estado")).body.tallyResult).toBeNull();
      expect((await liz.post("/api/comision/designar-vp", { candidateId: candidates[2] })).status).toBe(409);
    });

    it("la Comisión solo elige entre los empatados y con motivo y acta", async () => {
      expect((await liz.post("/api/escrutinio/empate", { presidentId: candidates[5], justification: "Intento con un no empatado", acta: "AC-7" })).status).toBe(422);
      expect((await liz.post("/api/escrutinio/empate", { presidentId: candidates[1] })).status).toBe(422);
      const r = await liz.post("/api/escrutinio/empate", { presidentId: candidates[1], justification: "Acuerdo unánime de la Comisión", acta: "AC-7/2026" });
      expect(r.status).toBe(200);
      expect(r.body.tally.presidentId).toBe(candidates[1]);
    });

    it("proclamado: el votante ve los resultados y la decisión de la Comisión", async () => {
      const view = await voters[0]!.json("/api/eleccion/estado");
      expect(view.body.tallyResult.presidentId).toBe(candidates[1]);
      expect(view.body.tieResolution.acta).toBe("AC-7/2026");
    });
  });

  describe("vicepresidente y vacantes", () => {
    it("el presidente no puede ser VP; se designa otro electo", async () => {
      expect((await liz.post("/api/comision/designar-vp", { candidateId: candidates[1] })).status).toBe(422);
      expect((await liz.post("/api/comision/designar-vp", { candidateId: candidates[2] })).status).toBe(200);
    });

    it("ante la vacante presidencial asume el VP y luego se designa un VP nuevo", async () => {
      const v = await liz.post("/api/comision/vacante", { type: "VACANCIA_PRESIDENTE", reason: "DIMISION_VOLUNTARIA", justification: "Renuncia por motivos académicos" });
      expect(v.status).toBe(200);
      expect(v.body.composition.president.candidateId).toBe(candidates[2]);
      const n = await liz.post("/api/comision/vacante", { type: "DESIGNAR_NUEVO_VP", successorCandidateId: candidates[3], justification: "Designación del nuevo VP" });
      expect(n.status).toBe(200);
      expect(n.body.composition.vicePresident.candidateId).toBe(candidates[3]);
    });

    it("el estado final queda persistido (FINALIZADA, composición versión 3)", async () => {
      const view = await liz.json("/api/eleccion/estado");
      expect(view.body.summary.status).toBe("FINALIZADA");
      expect(view.body.composition.version).toBe(3);
    });
  });

  it("la cadena de auditoría está íntegra", async () => {
    const r = await liz.json("/api/auditoria");
    expect(r.body.chainIntegrity).toEqual({ valid: true });
  });

  it("la auditoría del voto no contiene identidad", async () => {
    const r = await liz.json("/api/auditoria");
    const votes = r.body.recentEvents.filter((e: { eventType: string }) => e.eventType === "BOLETA_EMITIDA");
    expect(votes.every((e: { actorRole: string }) => e.actorRole === "VOTER")).toBe(true);
  });
});
