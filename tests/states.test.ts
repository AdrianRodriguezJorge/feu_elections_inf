import { describe, expect, it } from "vitest";
import { availableTransitions, canTransition, isTerminal, isVisibleToVoter, TRANSITIONS } from "@/domain/states";
import type { ProcessStatus } from "@/domain/types";

describe("Máquina de estados v1 (F2)", () => {
  it("la Comisión y el Administrador abren y cierran la votación", () => {
    for (const role of ["ADMIN", "COMMISSION"] as const) {
      expect(canTransition("CONVOCADO", "ABIERTA", role)).toBe(true);
      expect(canTransition("ABIERTA", "CERRADA", role)).toBe(true);
    }
  });

  it("votantes y observadores no cambian ningún estado", () => {
    for (const from of Object.keys(TRANSITIONS) as ProcessStatus[]) {
      expect(availableTransitions(from, "VOTER")).toHaveLength(0);
      expect(availableTransitions(from, "OBSERVER")).toHaveLength(0);
    }
  });

  it("no se puede reabrir una votación cerrada ni volver a CONVOCADO", () => {
    expect(canTransition("CERRADA", "ABIERTA", "ADMIN")).toBe(false);
    expect(canTransition("PROCLAMADA", "ABIERTA", "ADMIN")).toBe(false);
    for (const from of Object.keys(TRANSITIONS) as ProcessStatus[]) {
      expect(TRANSITIONS[from].some((t) => t.to === "CONVOCADO")).toBe(false);
    }
  });

  it("el escrutinio solo sale de CERRADA y SIN_QUORUM es terminal", () => {
    expect(canTransition("ABIERTA", "PROCLAMADA", "COMMISSION")).toBe(false);
    expect(canTransition("CERRADA", "SIN_QUORUM", "COMMISSION")).toBe(true);
    expect(isTerminal("SIN_QUORUM")).toBe(true);
  });

  it("un empate solo lleva a PROCLAMADA (decisión de la Comisión)", () => {
    expect(availableTransitions("EMPATE", "COMMISSION").map((t) => t.to)).toEqual(["PROCLAMADA"]);
  });

  it("el votante solo ve la boleta en ABIERTA", () => {
    expect(isVisibleToVoter("ABIERTA")).toBe(true);
    expect(isVisibleToVoter("CONVOCADO")).toBe(false);
    expect(isVisibleToVoter("CERRADA")).toBe(false);
  });
});
