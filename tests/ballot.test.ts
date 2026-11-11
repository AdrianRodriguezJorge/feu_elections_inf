import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { readMarks, validateBallot } from "@/domain/ballot";
import { buildProcessRules } from "@/domain/seats";
import type { BallotSelection } from "@/domain/types";

const CANDIDATES = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11"];
const RULES = buildProcessRules(CANDIDATES.length); // N = 9

function mark(
  processCandidateId: string,
  opts: { member?: boolean; president?: boolean } = {},
): BallotSelection {
  return {
    processCandidateId,
    member: opts.member ?? true,
    president: opts.president ?? false,
  };
}

describe("Validación de la boleta (RGF-11, Q-L02)", () => {
  it("acepta N miembros y 1 presidente entre ellos", () => {
    const selections = [
      mark("c1", { member: true, president: true }),
      ...CANDIDATES.slice(1, 9).map((id) => mark(id)),
    ];
    const outcome = validateBallot(selections, RULES, CANDIDATES);
    expect(outcome.ok).toBe(true);
  });

  it("acepta menos de N miembros (Art. 61 dice «hasta»)", () => {
    const selections = [mark("c1"), mark("c2"), mark("c3", { president: true })];
    const outcome = validateBallot(selections, RULES, CANDIDATES);
    expect(outcome.ok).toBe(true);
  });

  it("rechaza 0 marcas: no hay voto en blanco", () => {
    const outcome = validateBallot([], RULES, CANDIDATES);
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.map((e) => e.code)).toContain("MARCA_MIEMBRO_CERO");
  });

  it("rechaza N+1 miembros", () => {
    const selections = [
      ...CANDIDATES.slice(0, 10).map((id) => mark(id)),
      mark("c1", { president: true }),
    ];
    const outcome = validateBallot(selections, RULES, CANDIDATES);
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.map((e) => e.code)).toContain("MARCA_MIEMBRO_EXCESO");
  });

  it("rechaza 2 presidentes", () => {
    const selections = [
      mark("c1"),
      mark("c2"),
      mark("c1", { president: true }),
      mark("c2", { president: true }),
    ];
    const outcome = validateBallot(selections, RULES, CANDIDATES);
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.map((e) => e.code)).toContain("MARCA_PRESIDENTE_MULTIPLE");
  });

  it("rechaza presidente que no está marcado como miembro", () => {
    const selections = [mark("c1"), mark("c2"), mark("c3", { member: false, president: true })];
    const outcome = validateBallot(selections, RULES, CANDIDATES);
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.map((e) => e.code)).toContain("PRESIDENTE_NO_MIEMBRO");
  });

  it("rechaza 0 presidentes", () => {
    const selections = [mark("c1"), mark("c2")];
    const outcome = validateBallot(selections, RULES, CANDIDATES);
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.map((e) => e.code)).toContain("MARCA_PRESIDENTE_CERO");
  });

  it("rechaza candidato repetido", () => {
    const selections = [mark("c1"), mark("c1"), mark("c2", { president: true })];
    const outcome = validateBallot(selections, RULES, CANDIDATES);
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.map((e) => e.code)).toContain("CANDIDATO_REPETIDO");
  });

  it("rechaza candidato fuera de la lista cargada", () => {
    const selections = [mark("c1"), mark("fantasma"), mark("c2", { president: true })];
    const outcome = validateBallot(selections, RULES, CANDIDATES);
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.map((e) => e.code)).toContain("CANDIDATO_FUERA_DE_LISTA");
  });

  it("extrae las marcas de una boleta válida", () => {
    const selections = [mark("c1"), mark("c2"), mark("c3", { president: true })];
    const { memberIds, presidentId } = readMarks(selections);
    expect(memberIds).toEqual(["c1", "c2", "c3"]);
    expect(presidentId).toBe("c3");
  });

  it("INV-01/02/03: toda boleta válida respeta los tres invariantes", () => {
    fc.assert(
      fc.property(
        fc.subarray(CANDIDATES, { minLength: 1, maxLength: CANDIDATES.length }),
        fc.subarray(CANDIDATES, { minLength: 0, maxLength: 2 }),
        (members, presidents) => {
          const selections: BallotSelection[] = [
            ...members.map((id) => mark(id)),
            ...presidents.map((id) => mark(id, { member: false, president: true })),
          ];
          const outcome = validateBallot(selections, RULES, CANDIDATES);
          if (outcome.ok) {
            const m = selections.filter((s) => s.member).length;
            const p = selections.filter((s) => s.president).length;
            expect(m).toBeGreaterThanOrEqual(1);
            expect(m).toBeLessThanOrEqual(RULES.maxMemberMarks);
            expect(p).toBe(1);
            const memberIds = new Set(
              selections.filter((s) => s.member).map((s) => s.processCandidateId),
            );
            for (const sel of selections.filter((s) => s.president)) {
              expect(memberIds.has(sel.processCandidateId)).toBe(true);
            }
          }
        },
      ),
    );
  });
});
