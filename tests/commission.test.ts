import { describe, expect, it } from "vitest";
import { validateCommissionConstitution } from "@/domain/commission";

const ACTIVE_BRIGADES = ["11", "12", "22", "32", "41"];

describe("Comisión Electoral de Facultad (Art. 41-48, RGF-22)", () => {
  it("acepta una Comisión debidamente constituida con presidente, VP y representantes", () => {
    const res = validateCommissionConstitution({
      presidentUserId: "user-pres",
      vicePresidentUserId: "user-vp",
      actaText: "Acta de constitución celebrada el 10 de octubre de 2026...",
      activeBrigadeCodes: ACTIVE_BRIGADES,
      representatives: [
        { userId: "rep-11", name: "Rep 11", brigadeCode: "11" },
        { userId: "rep-12", name: "Rep 12", brigadeCode: "12" },
        { userId: "rep-22", name: "Rep 22", brigadeCode: "22" },
        { userId: "rep-32", name: "Rep 32", brigadeCode: "32" },
        { userId: "rep-41", name: "Rep 41", brigadeCode: "41" },
      ],
    });

    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("rechaza si falta representante de alguna brigada activa (Art. 47)", () => {
    const res = validateCommissionConstitution({
      presidentUserId: "user-pres",
      vicePresidentUserId: "user-vp",
      actaText: "Acta...",
      activeBrigadeCodes: ACTIVE_BRIGADES,
      representatives: [
        { userId: "rep-11", name: "Rep 11", brigadeCode: "11" },
        // Falta 12, 22, 32, 41
      ],
    });

    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("Faltan representantes"))).toBe(true);
  });

  it("rechaza si el Presidente y el Vicepresidente son la misma persona", () => {
    const res = validateCommissionConstitution({
      presidentUserId: "same-user",
      vicePresidentUserId: "same-user",
      actaText: "Acta...",
      activeBrigadeCodes: ["11"],
      representatives: [{ userId: "rep-11", name: "Rep 11", brigadeCode: "11" }],
    });

    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("personas distintas"))).toBe(true);
  });

  it("rechaza si no tiene acta formal registrada (RGF-22)", () => {
    const res = validateCommissionConstitution({
      presidentUserId: "user-pres",
      vicePresidentUserId: "user-vp",
      actaText: "",
      activeBrigadeCodes: ["11"],
      representatives: [{ userId: "rep-11", name: "Rep 11", brigadeCode: "11" }],
    });

    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("acta formal"))).toBe(true);
  });
});
