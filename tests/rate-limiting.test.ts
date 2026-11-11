import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/server/rate-limiter";

describe("Limitador de Tasa / Rate Limiting con Ventana Deslizante (Item 7.4)", () => {
  it("permite peticiones dentro del límite asignado", () => {
    const key = "test-client-1";
    const res1 = checkRateLimit(key, 5, 10_000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(4);

    const res2 = checkRateLimit(key, 5, 10_000);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it("bloquea y retorna HTTP 429 con Retry-After cuando se supera el umbral", () => {
    const key = "test-client-blocked-" + Date.now();
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 5_000);
    }
    const blockedRes = checkRateLimit(key, 3, 5_000);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.resetSeconds).toBeGreaterThan(0);
  });
});

