import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { validateCI } from "@/domain/ci";

describe("Validación de Carnet de Identidad (CI)", () => {
  it("acepta un CI válido de 11 dígitos", () => {
    // 03080468489: 04 de agosto de 2003, sexo masculino (dígito 9 es 8, par)
    const res = validateCI("03080468489");
    expect(res.valid).toBe(true);
    expect(res.data?.year).toBe(2003);
    expect(res.data?.month).toBe(8);
    expect(res.data?.day).toBe(4);
    expect(res.data?.gender).toBe("MASCULINO");
  });

  it("detecta correctamente el sexo femenino (dígito 9 impar)", () => {
    // 02052981315: 29 de mayo de 2002, dígito 9 es 1 (impar -> femenino)
    const res = validateCI("02052981315");
    expect(res.valid).toBe(true);
    expect(res.data?.gender).toBe("FEMENINO");
  });

  it("rechaza CI con longitud distinta de 11 dígitos", () => {
    expect(validateCI("1234567890").valid).toBe(false);
    expect(validateCI("123456789012").valid).toBe(false);
    expect(validateCI("").valid).toBe(false);
  });

  it("rechaza caracteres no numéricos", () => {
    expect(validateCI("030804A8489").valid).toBe(false);
    expect(validateCI("030804-8489").valid).toBe(false);
  });

  it("rechaza mes de nacimiento inválido", () => {
    expect(validateCI("03000468489").valid).toBe(false); // mes 00
    expect(validateCI("03130468489").valid).toBe(false); // mes 13
  });

  it("rechaza día de nacimiento inválido según el mes", () => {
    expect(validateCI("03023068489").valid).toBe(false); // 30 de febrero
    expect(validateCI("03043168489").valid).toBe(false); // 31 de abril (solo tiene 30)
    expect(validateCI("03013268489").valid).toBe(false); // día 32
  });

  it("INV: todo CI válido tiene exactamente 11 dígitos numéricos", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const res = validateCI(s);
        if (res.valid) {
          expect(res.data?.ci).toHaveLength(11);
          expect(/^\d{11}$/.test(res.data!.ci)).toBe(true);
        }
      }),
    );
  });
});
