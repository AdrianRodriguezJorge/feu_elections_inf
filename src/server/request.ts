/**
 * IP del cliente para el limitador de tasa.
 *
 * Detrás de Vercel `x-real-ip` lo fija la plataforma; `x-forwarded-for` solo se
 * usa como respaldo y se toma el primer salto.
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "local";
}
