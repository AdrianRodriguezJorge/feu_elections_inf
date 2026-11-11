/**
 * Validación pura de contraseñas sin dependencias de Node.js crypto (apto para cliente y servidor).
 */

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: "La contraseña debe incluir al menos una letra." };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: "La contraseña debe incluir al menos un número." };
  }
  return { valid: true };
}

