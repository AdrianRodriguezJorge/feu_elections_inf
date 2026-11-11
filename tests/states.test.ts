import { describe, expect, it } from "vitest";
import {
  availableTransitions,
  canTransition,
  isTerminal,
  isVisibleToVoter,
  TRANSITIONS,
} from "@/domain/states";
import type { ProcessStatus, UserRole } from "@/domain/types";

describe("Máquina de estados y roles (09 §3.1)", () => {
  it("el ADMIN inicia el proceso y cambia los estados decisivos", () => {
    expect(canTransition("BORRADOR", "CONVOCADO", "ADMIN")).toBe(true);
    expect(canTransition("LISTO", "ABIERTA", "ADMIN")).toBe(true);
    expect(canTransition("ABIERTA", "CERRADA", "ADMIN")).toBe(true);
  });

  it("la COMISIÓN cambia los estados intermedios que el votante no ve", () => {
    expect(canTransition("CONVOCADO", "LISTO", "COMMISSION")).toBe(true);
    expect(canTransition("CERRADA", "ESCRUTADA", "COMMISSION")).toBe(true);
    expect(canTransition("ESCRUTADA", "PROCLAMADA", "COMMISSION")).toBe(true);
    expect(canTransition("PROCLAMADA", "VP_DESIGNADA", "COMMISSION")).toBe(true);
    expect(canTransition("VP_DESIGNADA", "FINALIZADA", "COMMISSION")).toBe(true);
    expect(canTransition("FINALIZADA", "VACANTE", "COMMISSION")).toBe(true);
  });

  it("el VOTER no cambia ningún estado del proceso", () => {
    for (const from of Object.keys(TRANSITIONS) as ProcessStatus[]) {
      for (const transition of TRANSITIONS[from]) {
        expect(transition.roles).not.toContain("VOTER");
      }
    }
  });

  it("el OBSERVER no cambia ningún estado", () => {
    for (const from of Object.keys(TRANSITIONS) as ProcessStatus[]) {
      for (const transition of TRANSITIONS[from]) {
        expect(transition.roles).not.toContain("OBSERVER");
      }
    }
  });

  it("la COMISIÓN no abre ni cierra la votación", () => {
    expect(canTransition("LISTO", "ABIERTA", "COMMISSION")).toBe(false);
    expect(canTransition("ABIERTA", "CERRADA", "COMMISSION")).toBe(false);
  });

  it("el votante solo ve ABIERTA", () => {
    expect(isVisibleToVoter("ABIERTA")).toBe(true);
    expect(isVisibleToVoter("BORRADOR")).toBe(false);
    expect(isVisibleToVoter("ESCRUTADA")).toBe(false);
    expect(isVisibleToVoter("FINALIZADA")).toBe(false);
  });

  it("no se puede reabrir un proceso cerrado", () => {
    expect(canTransition("CERRADA", "ABIERTA", "ADMIN")).toBe(false);
    expect(canTransition("FINALIZADA", "ABIERTA", "ADMIN")).toBe(false);
  });

  it("ANULADA es terminal", () => {
    expect(isTerminal("ANULADA")).toBe(true);
    expect(availableTransitions("ANULADA", "ADMIN")).toHaveLength(0);
  });

  it("cada transición declara al menos un rol autorizado", () => {
    for (const from of Object.keys(TRANSITIONS) as ProcessStatus[]) {
      for (const transition of TRANSITIONS[from]) {
        expect(transition.roles.length).toBeGreaterThan(0);
        expect(transition.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("todo rol sin permiso no ve transiciones disponibles", () => {
    const roles: UserRole[] = ["ADMIN", "COMMISSION", "VOTER", "OBSERVER"];
    for (const from of Object.keys(TRANSITIONS) as ProcessStatus[]) {
      for (const role of roles) {
        for (const transition of availableTransitions(from, role)) {
          expect(transition.roles).toContain(role);
        }
      }
    }
  });
});
