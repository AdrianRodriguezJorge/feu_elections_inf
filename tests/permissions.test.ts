import { describe, expect, it } from "vitest";
import { canCastBallot, hasPermission } from "@/domain/permissions";

describe("Roles, Autorización y Emisión de Voto (F2, RGF-25, INV-06)", () => {
  it("el ADMIN puede gestionar brigadas y convocar/abrir votación", () => {
    expect(hasPermission("ADMIN", "MANAGE_BRIGADES")).toBe(true);
    expect(hasPermission("ADMIN", "OPEN_VOTING")).toBe(true);
    expect(hasPermission("ADMIN", "CLOSE_VOTING")).toBe(true);
    expect(hasPermission("ADMIN", "CONSTITUTE_COMMISSION")).toBe(true);
  });

  it("la COMISIÓN gestiona padrón, candidatos y escrutinio", () => {
    expect(hasPermission("COMMISSION", "IMPORT_PADRON")).toBe(true);
    expect(hasPermission("COMMISSION", "MANAGE_CANDIDATES")).toBe(true);
    expect(hasPermission("COMMISSION", "TALLY_VOTES")).toBe(true);
    expect(hasPermission("COMMISSION", "PROCLAIM_RESULTS")).toBe(true);
    expect(hasPermission("COMMISSION", "DESIGNATE_VICE_PRESIDENT")).toBe(true);
  });

  it("el VOTER no puede administrar ni importar ni escrutar", () => {
    expect(hasPermission("VOTER", "MANAGE_BRIGADES")).toBe(false);
    expect(hasPermission("VOTER", "IMPORT_PADRON")).toBe(false);
    expect(hasPermission("VOTER", "OPEN_VOTING")).toBe(false);
    expect(hasPermission("VOTER", "TALLY_VOTES")).toBe(false);
  });

  it("el OBSERVER solo puede observar resultados, actas y auditoría", () => {
    expect(hasPermission("OBSERVER", "VIEW_RESULTS")).toBe(true);
    expect(hasPermission("OBSERVER", "VIEW_AUDIT_LOG")).toBe(true);
    expect(hasPermission("OBSERVER", "CAST_BALLOT")).toBe(false);
    expect(hasPermission("OBSERVER", "MANAGE_BRIGADES")).toBe(false);
  });

  it("canCastBallot: permite votar a miembro habilitado cuando el proceso está en ABIERTA", () => {
    const res = canCastBallot("VOTER", "ABIERTA", true, false);
    expect(res.allowed).toBe(true);
  });

  it("canCastBallot: los miembros de la COMISIÓN son parte del padrón y también pueden votar", () => {
    expect(hasPermission("COMMISSION", "CAST_BALLOT")).toBe(true);
    const res = canCastBallot("COMMISSION", "ABIERTA", true, false);
    expect(res.allowed).toBe(true);
  });

  it("canCastBallot: rechaza si el proceso no está en ABIERTA", () => {
    expect(canCastBallot("VOTER", "CONVOCADO", true, false).allowed).toBe(false);
    expect(canCastBallot("VOTER", "EMPATE", true, false).allowed).toBe(false);
    expect(canCastBallot("VOTER", "CERRADA", true, false).allowed).toBe(false);
    expect(canCastBallot("VOTER", "FINALIZADA", true, false).allowed).toBe(false);
  });

  it("canCastBallot: rechaza si el elector no está habilitado en el padrón", () => {
    const res = canCastBallot("VOTER", "ABIERTA", false, false);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("no está habilitado");
  });

  it("canCastBallot (INV-06 / RGF-25): rechaza doble voto si ya votó previamente", () => {
    const res = canCastBallot("VOTER", "ABIERTA", true, true);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("Ya emitiste tu voto");
  });
});
