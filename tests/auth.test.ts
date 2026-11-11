import { describe, expect, it } from "vitest";
import {
  generateMfaSecret,
  generateTotpToken,
  hashPassword,
  validateAccountActivation,
  validatePasswordStrength,
  verifyPassword,
  verifyTotpToken,
} from "@/domain/auth";

describe("Autenticación, Hashing, Activación y MFA (F2)", () => {
  it("hashea y verifica contraseñas correctamente", () => {
    const raw = "ContrasenaSegura2026!";
    const hash = hashPassword(raw);

    expect(hash.startsWith("pbkdf2:")).toBe(true);
    expect(verifyPassword(raw, hash)).toBe(true);
    expect(verifyPassword("Incorrecta123", hash)).toBe(false);
  });

  it("genera sales aleatorias diferentes para la misma contraseña", () => {
    const raw = "MismaClave123";
    const h1 = hashPassword(raw);
    const h2 = hashPassword(raw);

    expect(h1).not.toBe(h2);
    expect(verifyPassword(raw, h1)).toBe(true);
    expect(verifyPassword(raw, h2)).toBe(true);
  });

  it("valida la complejidad mínima de contraseña (8 caracteres, letras y números)", () => {
    expect(validatePasswordStrength("corta1").valid).toBe(false);
    expect(validatePasswordStrength("sololetras").valid).toBe(false);
    expect(validatePasswordStrength("123456789").valid).toBe(false);
    expect(validatePasswordStrength("Correcta2026").valid).toBe(true);
  });

  it("valida la activación de cuenta a partir del padrón electoral", () => {
    const validMembership = {
      id: "mem-1",
      studentId: "03080468489",
      fullName: "Adán Adán Cabrera",
      eligible: true,
      userId: null,
    };

    // Caso exitoso
    const resOk = validateAccountActivation({
      ci: "03080468489",
      email: "adan@estudiantes.cu",
      password: "ClaveSegura2026",
      membership: validMembership,
    });
    expect(resOk.valid).toBe(true);
    expect(resOk.errors).toHaveLength(0);

    // Caso exitoso sin correo (credenciales provisionales basadas en Nombre + CI)
    const resNoEmail = validateAccountActivation({
      ci: "03080468489",
      password: "ClaveSegura2026",
      membership: validMembership,
    });
    expect(resNoEmail.valid).toBe(true);
    expect(resNoEmail.errors).toHaveLength(0);

    // No existe en listado de electores
    const resNoMem = validateAccountActivation({
      ci: "03080468489",
      email: "adan@estudiantes.cu",
      password: "ClaveSegura2026",
      membership: null,
    });
    expect(resNoMem.valid).toBe(false);
    expect(resNoMem.errors.some((e) => e.includes("no figura en el listado de electores"))).toBe(true);

    // Miembro no elegible
    const resIneligible = validateAccountActivation({
      ci: "03080468489",
      email: "adan@estudiantes.cu",
      password: "ClaveSegura2026",
      membership: { ...validMembership, eligible: false },
    });
    expect(resIneligible.valid).toBe(false);
    expect(resIneligible.errors.some((e) => e.includes("no está habilitado"))).toBe(true);

    // Ya activado previamente
    const resAlreadyActive = validateAccountActivation({
      ci: "03080468489",
      email: "adan@estudiantes.cu",
      password: "ClaveSegura2026",
      membership: { ...validMembership, userId: "user-existing" },
    });
    expect(resAlreadyActive.valid).toBe(false);
    expect(resAlreadyActive.errors.some((e) => e.includes("ya tiene una cuenta"))).toBe(true);
  });

  it("genera y verifica códigos TOTP de 6 dígitos para MFA (ADMIN y COMMISSION)", () => {
    const secret = generateMfaSecret();
    const now = Date.now();
    const token = generateTotpToken(secret, now);

    expect(token).toHaveLength(6);
    expect(/^\d{6}$/.test(token)).toBe(true);

    // Válido en el mismo instante
    expect(verifyTotpToken(token, secret, now)).toBe(true);

    // Válido dentro de la ventana de ±30 segundos
    expect(verifyTotpToken(token, secret, now + 25_000)).toBe(true);
    expect(verifyTotpToken(token, secret, now - 25_000)).toBe(true);

    // Rechazado con secreto incorrecto o token expirado (> 60s)
    const wrongSecret = generateMfaSecret();
    expect(verifyTotpToken(token, wrongSecret, now)).toBe(false);
    expect(verifyTotpToken(token, secret, now + 70_000)).toBe(false);
  });
});
