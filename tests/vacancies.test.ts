import { describe, expect, it } from "vitest";
import {
  createInitialComposition,
  processPresidentialVacancy,
  designateSuccessorVicePresident,
} from "@/domain/vacancies";

describe("Gestión de Vacantes y Sucesión Presidencial (Arts. 99–102)", () => {
  const president = {
    candidateId: "can-01",
    fullName: "Adrián Rodríguez Jorge",
    brigadeCode: "11",
  };
  const vicePresident = {
    candidateId: "can-02",
    fullName: "Adriana Porrata Morffi",
    brigadeCode: "22",
  };
  const members = [
    { candidateId: "can-03", fullName: "Pedro Chevalier Pérez", brigadeCode: "11" },
    { candidateId: "can-04", fullName: "Diana Delgado Fernández", brigadeCode: "12" },
    { candidateId: "can-05", fullName: "Leyder Herrera Bello", brigadeCode: "12" },
  ];

  it("crea la composición inicial versión 1 correctamente", () => {
    const comp = createInitialComposition(president, vicePresident, members);
    expect(comp.version).toBe(1);
    expect(comp.president.candidateId).toBe("can-01");
    expect(comp.vicePresident?.candidateId).toBe("can-02");
    expect(comp.members).toHaveLength(3);
    expect(comp.historicalEvents).toHaveLength(0);
  });

  it("sucesión por defecto: el Vicepresidente electo asume automáticamente la presidencia", () => {
    const comp1 = createInitialComposition(president, vicePresident, members);
    const res = processPresidentialVacancy({
      currentComposition: comp1,
      reason: "DIMISION_VOLUNTARIA",
      justification: "Razones personales y de dedicación académica",
    });

    expect(res.ok).toBe(true);
    expect(res.composition).toBeDefined();
    const comp2 = res.composition!;

    expect(comp2.version).toBe(2);
    // Adriana (antes VP) ahora es Presidente
    expect(comp2.president.candidateId).toBe("can-02");
    expect(comp2.president.fullName).toBe("Adriana Porrata Morffi");
    // La Vicepresidencia queda vacante hasta que se designe un sucesor
    expect(comp2.vicePresident).toBeNull();
    // Los miembros electos se mantienen intactos
    expect(comp2.members).toHaveLength(3);
    expect(comp2.historicalEvents).toHaveLength(1);
    expect(comp2.historicalEvents[0]?.vacatedRole).toBe("PRESIDENTE");
    expect(comp2.historicalEvents[0]?.outgoingCandidateId).toBe("can-01");
  });

  it("permite promover a otro miembro electo específico a la Presidencia (Art. 102)", () => {
    const comp1 = createInitialComposition(president, vicePresident, members);
    const res = processPresidentialVacancy({
      currentComposition: comp1,
      reason: "DIMISION_VOLUNTARIA",
      justification: "Acuerdo del Consejo de promover a Chevalier",
      successorCandidateId: "can-03", // Pedro Chevalier
    });

    expect(res.ok).toBe(true);
    const comp2 = res.composition!;
    expect(comp2.version).toBe(2);
    expect(comp2.president.candidateId).toBe("can-03");
    // Adriana sigue siendo Vicepresidenta
    expect(comp2.vicePresident?.candidateId).toBe("can-02");
    // Pedro fue removido de la lista de miembros ordinarios (quedan Diana y Leyder)
    expect(comp2.members).toHaveLength(2);
    expect(comp2.members.some((m) => m.candidateId === "can-03")).toBe(false);
  });

  it("rechaza promover a alguien que no sea miembro electo del Secretariado", () => {
    const comp1 = createInitialComposition(president, vicePresident, members);
    const res = processPresidentialVacancy({
      currentComposition: comp1,
      reason: "DIMISION_VOLUNTARIA",
      justification: "Intento inválido",
      successorCandidateId: "can-99-inexistente",
    });

    expect(res.ok).toBe(false);
    expect(res.error).toContain("debe pertenecer al Secretariado electo");
  });

  it("exige asistencia >85% del Consejo para separación disciplinaria (Art. 101)", () => {
    const comp1 = createInitialComposition(president, vicePresident, members);
    const res = processPresidentialVacancy({
      currentComposition: comp1,
      reason: "SEPARACION_DISCIPLINARIA",
      justification: "Falta disciplinaria grave",
      councilAttendancePct: 80, // Falta el quórum de asistencia (>85%)
    });

    expect(res.ok).toBe(false);
    expect(res.error).toContain("más del 85 %");
  });

  it("permite designar a un nuevo Vicepresidente ante vacante (Art. 67)", () => {
    const comp1 = createInitialComposition(president, vicePresident, members);
    // 1. Vacancia de presidente -> Adriana asume -> VP vacante
    const resVac = processPresidentialVacancy({
      currentComposition: comp1,
      reason: "DIMISION_VOLUNTARIA",
      justification: "Renuncia",
    });
    const comp2 = resVac.composition!;
    expect(comp2.vicePresident).toBeNull();

    // 2. Designar a Diana Delgado como nueva Vicepresidenta
    const resDesig = designateSuccessorVicePresident(comp2, "can-04", "Nueva VP designada");
    expect(resDesig.ok).toBe(true);
    const comp3 = resDesig.composition!;
    expect(comp3.version).toBe(3);
    expect(comp3.vicePresident?.candidateId).toBe("can-04");
    expect(comp3.vicePresident?.fullName).toBe("Diana Delgado Fernández");
    // Diana ya no es miembro ordinario
    expect(comp3.members).toHaveLength(2);
  });
});
