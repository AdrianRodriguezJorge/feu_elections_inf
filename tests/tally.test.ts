import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { recommendSuccessor, recommendVicePresident, resolveTie, tally } from "@/domain/tally";
import type { BallotSelection } from "@/domain/types";

// 5 candidatos → 3 puestos (N = C − 2). Los escenarios dejan el corte sin empate
// salvo que el test busque precisamente un empate.
const IDS = ["a", "b", "c", "d", "e"];
const SEATS = 3;

function ballot(memberIds: string[], presidentId: string) {
  const allIds = Array.from(new Set([...memberIds, presidentId]));
  const selections: BallotSelection[] = allIds.map((id) => ({
    processCandidateId: id,
    member: memberIds.includes(id),
    president: id === presidentId,
  }));
  return { selections };
}

describe("Escrutinio (RGF-12, RGF-13, RGF-14)", () => {
  it("elige el top N por votos de miembro", () => {
    // 3 votantes: a y b con 3, c con 2, resto 0 → electos a, b, c...
    const ballots = [
      ballot(["a", "b", "c"], "a"),
      ballot(["a", "b", "c"], "b"),
      ballot(["a", "b", "d"], "a"),
    ];
    const result = tally(ballots, IDS, SEATS);
    expect(result.totals[0]?.candidateId).toBe("a");
    expect(result.totals[0]?.memberVotes).toBe(3);
    expect(result.totals[1]?.candidateId).toBe("b");
    expect(result.totals[1]?.memberVotes).toBe(3);
    expect(result.totals[2]?.candidateId).toBe("c");
    expect(result.totals[2]?.memberVotes).toBe(2);
    expect(result.elected).toHaveLength(SEATS);
  });

  it("el presidente sale de los electos por votos de presidente", () => {
    const ballots = [
      ballot(["a", "b", "c"], "a"),
      ballot(["a", "b", "c"], "b"),
      ballot(["a", "b", "c"], "b"),
    ];
    const result = tally(ballots, IDS, SEATS);
    expect(result.elected).toContain(result.presidentId);
    expect(result.presidentId).toBe("b");
    expect(result.tie).toBeNull();
  });

  it("detecta empate en el corte y exige segunda vuelta", () => {
    // 10 candidatos, 1 puesto: a y b empatan con 1 voto de miembro.
    const ballots = [ballot(["a"], "a"), ballot(["b"], "b")];
    const result = tally(ballots, ["a", "b"], 1);
    expect(result.tie?.type).toBe("CUT");
    expect(result.tie?.candidateIds).toContain("a");
    expect(result.tie?.candidateIds).toContain("b");
    expect(result.presidentId).toBeNull();
  });

  it("resuelve el empate del corte con los votos de presidente", () => {
    const ballots = [ballot(["a"], "a"), ballot(["b"], "a")];
    // a tiene 1 voto de miembro y 2 de presidente; b tiene 1 de miembro y 0.
    const result = tally(ballots, ["a", "b"], 1);
    expect(result.tie).toBeNull();
    expect(result.elected).toEqual(["a"]);
  });

  it("detecta empate en el corte entre candidatos que empatan en votos de presidente", () => {
    // 3 candidatos (a, b, c) con 1 voto de miembro cada uno.
    // 2 puestos a repartir.
    // a tiene 2 votos de presidente; b y c tienen 0 votos de presidente.
    // a ocupa el puesto 1; b y c empatan en el corte por el puesto 2.
    const ballots = [
      ballot(["a"], "a"),
      ballot(["b"], "a"),
      ballot(["c"], "a"),
    ];
    const result = tally(ballots, ["a", "b", "c"], 2);
    expect(result.tie?.type).toBe("CUT");
    expect(result.tie?.candidateIds).toEqual(["b", "c"]);
    expect(result.elected).toEqual([]);
    expect(result.presidentId).toBeNull();
  });

  it("detecta empate de presidente entre electos", () => {
    const ballots = [
      ballot(["a", "b"], "a"),
      ballot(["a", "b"], "b"),
    ];
    const result = tally(ballots, ["a", "b", "c"], 2);
    expect(result.tie?.type).toBe("PRESIDENT");
    expect(result.presidentId).toBeNull();
  });

  it("INV-08: el mismo conjunto de boletas da el mismo resultado", () => {
    const ballots = [
      ballot(["a", "b", "c"], "a"),
      ballot(["a", "d"], "d"),
      ballot(["b", "e"], "b"),
    ];
    const r1 = tally(ballots, IDS, SEATS);
    const r2 = tally([...ballots], IDS, SEATS);
    expect(r2.totals).toEqual(r1.totals);
    expect(r2.elected).toEqual(r1.elected);
    expect(r2.presidentId).toBe(r1.presidentId);
  });

  it("INV-04: los votos de presidente suman exactamente las boletas válidas", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.subarray(IDS, { minLength: 1, maxLength: SEATS }),
            fc.constantFrom(...IDS),
          ),
          { minLength: 1, maxLength: 30 },
        ),
        (raw) => {
          const ballots = raw.map(([members, president]) => ballot(members, president));
          const result = tally(ballots, IDS, SEATS);
          const sum = result.totals.reduce((acc, t) => acc + t.presidentVotes, 0);
          expect(sum).toBe(ballots.length);
        },
      ),
    );
  });

  it("INV-05: los votos de miembro no superan N por boleta válida", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.subarray(IDS, { minLength: 1, maxLength: SEATS }),
            fc.constantFrom(...IDS),
          ),
          { minLength: 1, maxLength: 30 },
        ),
        (raw) => {
          const ballots = raw.map(([members, president]) => ballot(members, president));
          const result = tally(ballots, IDS, SEATS);
          const sum = result.totals.reduce((acc, t) => acc + t.memberVotes, 0);
          expect(sum).toBeLessThanOrEqual(SEATS * ballots.length);
        },
      ),
    );
  });
});

describe("Vicepresidente y sucesión (RGF-18, RGF-31, Q-L13, Q-L14)", () => {
  it("recomienda al electo con más votos de miembro que no sea presidente", () => {
    const ballots = [
      ballot(["a", "b", "c"], "a"),
      ballot(["a", "b", "c"], "a"),
      ballot(["a", "b", "c"], "a"),
    ];
    const result = tally(ballots, IDS, SEATS);
    expect(result.presidentId).toBe("a");
    expect(recommendVicePresident(result)).toBe("b");
  });

  it("ante vacante, el sucesor recomendado es el vicepresidente vigente", () => {
    const ballots = [
      ballot(["a", "b", "c"], "a"),
      ballot(["a", "b", "c"], "b"),
    ];
    const result = tally(ballots, IDS, SEATS);
    expect(recommendSuccessor(result, "b")).toBe("b");
  });

  it("si no hay vicepresidente, recomienda al siguiente electo con más votos", () => {
    const ballots = [
      ballot(["a", "b", "c"], "a"),
      ballot(["a", "b", "c"], "a"),
      ballot(["a", "b", "c"], "a"),
    ];
    const result = tally(ballots, IDS, SEATS);
    expect(recommendSuccessor(result, null)).toBe("b");
  });
});

describe("Empates a cero votos y decisión de la Comisión (F2)", () => {
  it("un empate a cero votos en el corte se detecta (no decide el orden alfabético)", () => {
    const ballots = [ballot(["a", "b"], "a")];
    const result = tally(ballots, IDS, SEATS);
    expect(result.tie?.type).toBe("CUT");
    expect(result.tie?.candidateIds).toEqual(["c", "d", "e"]);
    expect(result.elected).toEqual([]);
  });

  it("la Comisión completa el corte eligiendo entre los empatados", () => {
    const result = tally([ballot(["a", "b"], "a")], IDS, SEATS);
    const outcome = resolveTie(result, SEATS, { electedIds: ["d"] });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.elected.sort()).toEqual(["a", "b", "d"]);
    expect(outcome.result.presidentId).toBe("a");
    expect(outcome.result.tie).toBeNull();
    expect(outcome.result.resolution?.chosenIds).toEqual(["d"]);
  });

  it("rechaza elegir a alguien que no está empatado o un número incorrecto", () => {
    const result = tally([ballot(["a", "b"], "a")], IDS, SEATS);
    expect(resolveTie(result, SEATS, { electedIds: ["a"] }).ok).toBe(false);
    expect(resolveTie(result, SEATS, { electedIds: ["c", "d"] }).ok).toBe(false);
  });

  it("la Comisión elige al presidente entre los empatados en presidencia", () => {
    const result = tally([ballot(["a", "b"], "a"), ballot(["a", "b"], "b")], ["a", "b", "c"], 2);
    expect(resolveTie(result, 2, {}).ok).toBe(false);
    expect(resolveTie(result, 2, { presidentId: "c" }).ok).toBe(false);
    const outcome = resolveTie(result, 2, { presidentId: "b" });
    expect(outcome.ok && outcome.result.presidentId).toBe("b");
  });

  it("si tras completar el corte hay empate en presidencia, exige el presidente", () => {
    const ballots = [ballot(["a", "b"], "a"), ballot(["a", "b"], "b")];
    const result = tally(ballots, IDS, SEATS);
    expect(result.tie?.type).toBe("CUT");
    expect(resolveTie(result, SEATS, { electedIds: ["c"] }).ok).toBe(false);
    const outcome = resolveTie(result, SEATS, { electedIds: ["c"], presidentId: "a" });
    expect(outcome.ok && outcome.result.presidentId).toBe("a");
  });
});
