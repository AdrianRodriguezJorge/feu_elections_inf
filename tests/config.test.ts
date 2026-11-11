import { describe, expect, it } from "vitest";
import {
  calculateParticipationProgress,
  calculateRequiredVotes,
  DEFAULT_PROCESS_CONFIG,
  resolveProcessConfig,
} from "@/domain/config";

describe("Configuración Dinámica y Umbrales Electorales (F3)", () => {
  it("carga valores por defecto reglamentarios (ABC 2019)", () => {
    expect(DEFAULT_PROCESS_CONFIG.minParticipationPercentage).toBe(85);
    expect(DEFAULT_PROCESS_CONFIG.candidateSeatsMargin).toBe(2);
    expect(DEFAULT_PROCESS_CONFIG.minCandidates).toBe(5);
    expect(DEFAULT_PROCESS_CONFIG.minBrigadeSize).toBe(3);
    expect(DEFAULT_PROCESS_CONFIG.maxBrigadeSize).toBe(45);
    expect(DEFAULT_PROCESS_CONFIG.allowVoluntaryAnnulment).toBe(true);
  });

  it("permite personalizar parámetros y valida rangos", () => {
    const custom = resolveProcessConfig({
      minParticipationPercentage: 80,
      candidateSeatsMargin: 1,
      minCandidates: 4,
    });

    expect(custom.valid).toBe(true);
    expect(custom.config.minParticipationPercentage).toBe(80);
    expect(custom.config.candidateSeatsMargin).toBe(1);
    expect(custom.config.minCandidates).toBe(4);
    // Conserva los no especificados
    expect(custom.config.minBrigadeSize).toBe(3);
  });

  it("rechaza configuraciones inválidas (porcentaje fuera de rango, candidatos insuficientes)", () => {
    const badPct = resolveProcessConfig({ minParticipationPercentage: 110 });
    expect(badPct.valid).toBe(false);
    expect(badPct.errors.some((e) => e.includes("entre 1 y 100"))).toBe(true);

    const badSeats = resolveProcessConfig({
      candidateSeatsMargin: 3,
      minCandidates: 3, // N = 0 escaños
    });
    expect(badSeats.valid).toBe(false);
    expect(badSeats.errors.some((e) => e.includes("mayor al margen"))).toBe(true);
  });

  it("calculateRequiredVotes: calcula la cantidad exacta de votantes (>85% estricto)", () => {
    // 500 electores: 500 * 0.85 = 425 -> se necesitan 426 votantes (>85%)
    expect(calculateRequiredVotes(500, 85)).toBe(426);

    // 100 electores: 100 * 0.85 = 85 -> se necesitan 86 votantes
    expect(calculateRequiredVotes(100, 85)).toBe(86);

    // 11 electores: 11 * 0.85 = 9.35 -> floor(9.35) + 1 = 10 votantes (10/11 = 90.9%)
    expect(calculateRequiredVotes(11, 85)).toBe(10);

    // Con umbral del 80%: 500 * 0.80 = 400 -> 401 votantes
    expect(calculateRequiredVotes(500, 80)).toBe(401);
  });

  it("calculateParticipationProgress: reporta avance y meta cumplida en tiempo real", () => {
    // 500 electores, requeridos: 426
    const p1 = calculateParticipationProgress(300, 20, 500, 85);
    expect(p1.totalEligible).toBe(500);
    expect(p1.currentVotes).toBe(320); // 300 válidas + 20 anuladas
    expect(p1.requiredVotes).toBe(426);
    expect(p1.remainingVotes).toBe(106);
    expect(p1.requirementMet).toBe(false);

    // Cuando se alcanza o supera la meta
    const p2 = calculateParticipationProgress(410, 20, 500, 85);
    expect(p2.currentVotes).toBe(430);
    expect(p2.remainingVotes).toBe(0);
    expect(p2.requirementMet).toBe(true);
  });
});

