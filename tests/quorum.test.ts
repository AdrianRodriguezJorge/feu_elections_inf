import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { computeQuorum, quorumExceptionApplies } from "@/domain/quorum";

describe("Quórum (RGF-04, INV-16)", () => {
  it("84 % no alcanza el quórum; 86 % sí", () => {
    expect(
      computeQuorum({ validBallots: 84, annulledBallots: 0, eligibleMembers: 100, quorumPct: 85 })
        .quorumMet,
    ).toBe(false);
    expect(
      computeQuorum({ validBallots: 86, annulledBallots: 0, eligibleMembers: 100, quorumPct: 85 })
        .quorumMet,
    ).toBe(true);
  });

  it("exige estrictamente más del 85 % (no mayor o igual)", () => {
    const exact = computeQuorum({
      validBallots: 85,
      annulledBallots: 0,
      eligibleMembers: 100,
      quorumPct: 85,
    });
    expect(exact.participationPct).toBe(85);
    expect(exact.quorumMet).toBe(false);
  });

  it("las anuladas cuentan participación pero no son votos válidos", () => {
    const result = computeQuorum({
      validBallots: 80,
      annulledBallots: 6,
      eligibleMembers: 100,
      quorumPct: 85,
    });
    expect(result.participations).toBe(86);
    expect(result.participationPct).toBe(86);
    expect(result.quorumMet).toBe(true);
  });

  it("quien no vota no suma a la participación", () => {
    const result = computeQuorum({
      validBallots: 50,
      annulledBallots: 0,
      eligibleMembers: 100,
      quorumPct: 85,
    });
    expect(result.participations).toBe(50);
    expect(result.quorumMet).toBe(false);
  });

  it("la excepción del 80 % solo aplica a universidad y con aprobación", () => {
    expect(quorumExceptionApplies("CENTRO", false, 80, true)).toBe(true);
    expect(quorumExceptionApplies("CENTRO", false, 80, false)).toBe(false);
    expect(quorumExceptionApplies("FACULTAD", false, 80, true)).toBe(false);
    expect(quorumExceptionApplies("NACIONAL", false, 80, true)).toBe(false);
  });

  it("INV-16: participación = válidas + anuladas", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (valid, annulled, members) => {
          const result = computeQuorum({
            validBallots: valid,
            annulledBallots: annulled,
            eligibleMembers: members,
            quorumPct: 85,
          });
          expect(result.participations).toBe(valid + annulled);
        },
      ),
    );
  });
});
