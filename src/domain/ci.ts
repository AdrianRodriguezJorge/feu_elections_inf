/**
 * Validación y utilidades del Carnet de Identidad (CI).
 *
 * El Carnet de Identidad consta de 11 dígitos numéricos:
 *  - Dígitos 0-1: Año de nacimiento (YY).
 *  - Dígitos 2-3: Mes de nacimiento (MM, 01..12).
 *  - Dígitos 4-5: Día de nacimiento (DD, 01..31).
 *  - Dígito 9: Sexo asignado (par = masculino, impar = femenino).
 *
 * Reglas de la casa:
 *  - Módulo puro sin dependencias externas ni I/O.
 */

export interface CIData {
  ci: string;
  year: number;
  month: number;
  day: number;
  gender: "MASCULINO" | "FEMENINO";
  birthDate: Date;
}

export interface CIValidationResult {
  valid: boolean;
  error?: string;
  data?: CIData;
}

/**
 * Valida si una cadena cumple con el formato y coherencia de un Carnet de Identidad.
 *
 * @param rawCi cadena que representa el CI
 */
export function validateCI(rawCi: string): CIValidationResult {
  const ci = rawCi.trim();

  if (!ci) {
    return { valid: false, error: "El Carnet de Identidad no puede estar vacío." };
  }

  if (!/^\d{11}$/.test(ci)) {
    return {
      valid: false,
      error: `El CI debe contener exactamente 11 dígitos numéricos (recibido: ${ci.length}).`,
    };
  }

  const yy = parseInt(ci.slice(0, 2), 10);
  const mm = parseInt(ci.slice(2, 4), 10);
  const dd = parseInt(ci.slice(4, 6), 10);

  if (mm < 1 || mm > 12) {
    return {
      valid: false,
      error: `Mes de nacimiento inválido en CI (${mm}): debe estar entre 01 y 12.`,
    };
  }

  // Asumir siglo: si yy <= 26 asumimos 2000s, si no 1900s (para estudiantes universitarios actuales)
  const fullYear = yy <= 26 ? 2000 + yy : 1900 + yy;

  const daysInMonth = new Date(fullYear, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) {
    return {
      valid: false,
      error: `Día de nacimiento inválido en CI (${dd}) para el mes ${mm}/${fullYear}.`,
    };
  }

  const genderDigit = parseInt(ci.charAt(9), 10);
  const gender: "MASCULINO" | "FEMENINO" = genderDigit % 2 === 0 ? "MASCULINO" : "FEMENINO";

  return {
    valid: true,
    data: {
      ci,
      year: fullYear,
      month: mm,
      day: dd,
      gender,
      birthDate: new Date(Date.UTC(fullYear, mm - 1, dd)),
    },
  };
}
