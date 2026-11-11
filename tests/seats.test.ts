import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  buildProcessRules,
  canOpenProcess,
  deriveSeats,
  MIN_CANDIDATES,
  MIN_SEATS,
} from "@/domain/seats";

describe("Derivación de puestos (RGF-08, INV-13)", () => {
  it("deriva N = candidatos - 2", () => {
    expect(deriveSeats(11)).toBe(9);
    expect(deriveSeats(7)).toBe(5);
    expect(deriveSeats(5)).toBe(3);
  });

  it("no admite cantidades inválidas", () => {
    expect(() => deriveSeats(-1)).toThrow(RangeError);
    expect(() => deriveSeats(1.5)).toThrow(RangeError);
  });

  it("exige el mínimo de candidatos para una composición con sentido", () => {
    const tooFew = canOpenProcess(MIN_CANDIDATES - 1);
    expect(tooFew.ok).toBe(false);
    expect(canOpenProcess(MIN_CANDIDATES).ok).toBe(true);
    expect(MIN_SEATS).toBe(3);
  });

  it("la lista de la demo produce 9 puestos", () => {
    const result = canOpenProcess(11);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.seats).toBe(9);
  });

  it("maxMemberMarks siempre deriva de los puestos, nunca se fija a mano", () => {
    fc.assert(
      fc.property(fc.integer({ min: MIN_CANDIDATES, max: 60 }), (count) => {
        const rules = buildProcessRules(count);
        expect(rules.maxMemberMarks).toBe(count - 2);
        expect(rules.seatsRule).toBe("CANDIDATES_MINUS_TWO");
      }),
    );
  });

  it("el cambio de lista cambia N automáticamente", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_CANDIDATES, max: 40 }),
        fc.integer({ min: MIN_CANDIDATES, max: 40 }),
        (a, b) => {
          expect(deriveSeats(b) - deriveSeats(a)).toBe(b - a);
        },
      ),
    );
  });
});
