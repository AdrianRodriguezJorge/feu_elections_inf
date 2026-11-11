/**
 * Dominio puro de Identidad, Autenticación, Hashing y MFA (F2).
 *
 * Utiliza APIs estándar de criptografía (Web Crypto / Node crypto) sin dependencias
 * nativas pesadas para garantizar portabilidad multiplataforma.
 */

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { validateCI } from "./ci";

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

export interface AccountActivationInput {
  ci: string;
  email?: string;
  password: string;
  membership: {
    id: string;
    studentId: string;
    fullName: string;
    eligible: boolean;
    userId: string | null;
  } | null;
}

export interface ActivationValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Genera un hash seguro para la contraseña con salt aleatorio usando PBKDF2-SHA256.
 *
 * @param password contraseña en texto plano
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST,
  ).toString("hex");
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

/**
 * Verifica si una contraseña coincide con el hash almacenado.
 *
 * @param password contraseña candidata
 * @param storedHash hash en formato `pbkdf2:iterations:salt:hash`
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

    const iterations = parseInt(parts[1] ?? "", 10);
    const salt = parts[2] ?? "";
    const originalHash = parts[3] ?? "";

    const candidateHash = pbkdf2Sync(
      password,
      salt,
      iterations,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST,
    ).toString("hex");

    const originalBuf = Buffer.from(originalHash, "hex");
    const candidateBuf = Buffer.from(candidateHash, "hex");

    if (originalBuf.length !== candidateBuf.length) return false;
    return timingSafeEqual(originalBuf, candidateBuf);
  } catch {
    return false;
  }
}

import { validatePasswordStrength } from "./password";
export { validatePasswordStrength };

/**
 * Valida los datos para la activación de una cuenta de votante a partir del padrón.
 */
export function validateAccountActivation(
  input: AccountActivationInput,
): ActivationValidationResult {
  const errors: string[] = [];

  // 1. Validar CI
  const ciRes = validateCI(input.ci);
  if (!ciRes.valid) {
    errors.push(ciRes.error ?? "Carnet de Identidad inválido.");
  }

  // 2. Validar Email (opcional en credenciales provisionales sin correo)
  if (input.email && input.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email.trim())) {
      errors.push("El correo electrónico proporcionado no tiene un formato válido.");
    }
  }

  // 3. Validar Contraseña
  const pwdRes = validatePasswordStrength(input.password);
  if (!pwdRes.valid) {
    errors.push(pwdRes.error!);
  }

  // 4. Validar vinculación con el listado de electores
  if (!input.membership) {
    errors.push("El Carnet de Identidad no figura en el listado de electores de la Facultad.");
  } else {
    if (!input.membership.eligible) {
      errors.push("El miembro no está habilitado para votar (marcado como no elegible).");
    }
    if (input.membership.userId) {
      errors.push("Esta persona ya tiene una cuenta de usuario activada en el sistema.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Genera una semilla secreta para MFA (Base32 simplificada o hex).
 */
export function generateMfaSecret(): string {
  return randomBytes(20).toString("hex");
}

/**
 * Genera un código numérico TOTP de 6 dígitos basado en HMAC-SHA1 (RFC 6238).
 *
 * @param secret semilla secreta
 * @param timeMs tiempo actual en milisegundos (por defecto Date.now())
 * @param stepSecs duración de cada ventana de tiempo (por defecto 30 segundos)
 */
export function generateTotpToken(
  secret: string,
  timeMs: number = Date.now(),
  stepSecs: number = 30,
): string {
  const counter = Math.floor(timeMs / 1000 / stepSecs);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter), 0);

  const hmac = createHmac("sha1", Buffer.from(secret, "hex"));
  hmac.update(counterBuf);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  const otp = binary % 1_000_000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verifica un código TOTP admitiendo una ventana de tolerancia de ±1 paso (±30s).
 */
export function verifyTotpToken(
  token: string,
  secret: string,
  timeMs: number = Date.now(),
  windowSteps: number = 1,
): boolean {
  const cleanToken = token.trim();
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const stepMs = 30 * 1000;
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const checkTime = timeMs + offset * stepMs;
    const expected = generateTotpToken(secret, checkTime);
    if (expected === cleanToken) return true;
  }
  return false;
}
