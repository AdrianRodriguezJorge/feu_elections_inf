/**
 * Limitador de tasa (Rate Limiting) en memoria con ventana deslizante.
 * Protege contra ataques de fuerza bruta y saturación (Item 7.4).
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Evalúa si una clave (IP, CI o identificador) ha superado el límite de peticiones.
 *
 * @param key identificador único (ej: IP del cliente o CI)
 * @param maxRequests número máximo de peticiones permitidas en la ventana
 * @param windowMs duración de la ventana en milisegundos (por defecto 60 segundos)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60_000,
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // Primera petición o ventana expirada
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

