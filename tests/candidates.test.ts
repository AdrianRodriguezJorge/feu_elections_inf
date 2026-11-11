import { describe, expect, it } from "vitest";
import {
  buildCandidacySnapshot,
  CandidateInput,
  sanitizeBiographyMd,
  sortCandidatesForBallot,
} from "@/domain/candidates";

describe("Candidaturas, Ordenación de Boleta y Biografías (F3, Art. 59, RGF-09, INV-17)", () => {
  const sampleCandidates: CandidateInput[] = [
    {
      id: "c1",
      studentId: "CAN-001",
      name: "Beatriz",
      firstSurname: "Zayas",
      secondSurname: "Pérez",
      ci: "02052981315",
      brigadeCode: "41",
    },
    {
      id: "c2",
      studentId: "CAN-002",
      name: "Ángel",
      firstSurname: "Álvarez",
      secondSurname: "Gómez",
      ci: "03080468489",
      brigadeCode: "41",
    },
    {
      id: "c3",
      studentId: "CAN-003",
      name: "Carlos",
      firstSurname: "Alonso",
      secondSurname: "Molina",
      ci: "03020183061",
      brigadeCode: "41",
    },
    {
      id: "c4",
      studentId: "CAN-004",
      name: "Diana",
      firstSurname: "Núñez",
      secondSurname: "Díaz",
      ci: "02111574920",
      brigadeCode: "41",
    },
    {
      id: "c5",
      studentId: "CAN-005",
      name: "Ernesto",
      firstSurname: "Navarro",
      secondSurname: "Cruz",
      ci: "01041285033",
      brigadeCode: "41",
    },
  ];

  it("EF-16 / RGF-09: ordena alfabéticamente respetando el alfabeto español (Navarro antes que Núñez)", () => {
    const sorted = sortCandidatesForBallot(sampleCandidates);

    // En español: Alonso viene antes de Álvarez, y Navarro antes de Núñez
    const surnames = sorted.map((c) => c.firstSurname);
    expect(surnames[0]).toBe("Alonso");
    expect(surnames[1]).toBe("Álvarez");
    expect(surnames[2]).toBe("Navarro");
    expect(surnames[3]).toBe("Núñez");
    expect(surnames[4]).toBe("Zayas");
  });

  it("desempata por segundo apellido y por nombre cuando el primer apellido coincide", () => {
    const tied: CandidateInput[] = [
      {
        id: "t1",
        studentId: "CAN-T1",
        name: "Zoe",
        firstSurname: "Pérez",
        secondSurname: "Alonso",
        ci: "03080468489",
        brigadeCode: "41",
      },
      {
        id: "t2",
        studentId: "CAN-T2",
        name: "Ana",
        firstSurname: "Pérez",
        secondSurname: "Betancourt",
        ci: "02052981315",
        brigadeCode: "41",
      },
    ];

    const sorted = sortCandidatesForBallot(tied);
    expect(sorted[0]?.id).toBe("t1"); // Alonso va antes que Betancourt
  });

  it("INV-17 / EF-24: sanitiza Markdown eliminando etiquetas ejecutables, scripts y atributos peligrosos", () => {
    const maliciousMd =
      "## Mi propuesta\n<script>alert('pwned')</script>\n[Haz click](javascript:void(0))\n<img src='x' onerror='alert(1)'>";
    const { sanitized, hash } = sanitizeBiographyMd(maliciousMd);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("alert('pwned')");
    expect(sanitized).not.toContain("onerror=");
    expect(sanitized).toContain("blocked-javascript:");
    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64); // SHA-256 hex
  });

  it("EF-02: 5 candidatos configuran N = 3 escaños válidos", () => {
    const outcome = buildCandidacySnapshot(sampleCandidates);

    expect(outcome.valid).toBe(true);
    expect(outcome.candidatesCount).toBe(5);
    expect(outcome.seats).toBe(3);
    expect(outcome.snapshot).toHaveLength(5);
    expect(outcome.snapshot[0]?.ballotPosition).toBe(1);
    expect(outcome.snapshot[4]?.ballotPosition).toBe(5);
    expect(outcome.candidacyHash).toBeDefined();
    expect(outcome.candidacyHash).toHaveLength(64);
  });

  it("EF-03: rechaza menos de 5 candidatos para la elección de facultad", () => {
    const fourCandidates = sampleCandidates.slice(0, 4);
    const outcome = buildCandidacySnapshot(fourCandidates);

    expect(outcome.valid).toBe(false);
    expect(outcome.errors.some((e) => e.includes("al menos 5 candidatos"))).toBe(true);
  });

  it("EF-04: las banderas de validación de brigada y consejo son referenciales y no bloquean", () => {
    const candidatesWithFlags: CandidateInput[] = sampleCandidates.map((c, i) => ({
      ...c,
      brigadeValidated: i % 2 === 0,
      councilApproved: true,
    }));

    const outcome = buildCandidacySnapshot(candidatesWithFlags);
    expect(outcome.valid).toBe(true);
    expect(outcome.snapshot[0]?.brigadeValidated).toBe(true);
    expect(outcome.snapshot[1]?.brigadeValidated).toBe(false);
  });
});
