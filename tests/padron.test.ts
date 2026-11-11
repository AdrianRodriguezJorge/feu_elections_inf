import { describe, expect, it } from "vitest";
import {
  generatePadronTemplateCSV,
  importPadronIncremental,
  parseAndValidatePadronCSV,
  validateBrigadeSize,
} from "@/domain/padron";

const KNOWN_BRIGADES = ["11", "12", "22", "32", "41"];

describe("Validación e Importación de Padrón (EF-22, EF-23, RGF-24, RGF-34)", () => {
  it("EF-22: importa archivo CSV válido con brigadas existentes", () => {
    const csv = [
      "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada",
      "03080468489,Adán,Adán,Cabrera,41",
      "02052981315,Roxana,Almaguer,Sosa,41",
      "03020183061,Alejandro,Almeida,Cobas,41",
    ].join("\n");

    const result = parseAndValidatePadronCSV(csv, KNOWN_BRIGADES);

    expect(result.ok).toBe(true);
    expect(result.totalRows).toBe(3);
    expect(result.validRows).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows[0]?.fullName).toBe("Adán Adán Cabrera");
    expect(result.brigadeCounts["41"]).toBe(3);
  });

  it("admite delimitador de punto y coma o tabulador", () => {
    const csvSemicolon = [
      "Carnet de Identidad;Nombre;1er. Apellido;2do. Apellido;Brigada",
      "03080468489;Adán;Adán;Cabrera;41",
      "02052981315;Roxana;Almaguer;Sosa;41",
    ].join("\n");

    const res = parseAndValidatePadronCSV(csvSemicolon, KNOWN_BRIGADES);
    expect(res.ok).toBe(true);
    expect(res.validRows).toHaveLength(2);
  });

  it("EF-23: rechaza fila si la brigada no existe previamente (RGF-34)", () => {
    const csv = [
      "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada",
      "03080468489,Adán,Adán,Cabrera,999", // Brigada 999 no existe
    ].join("\n");

    const result = parseAndValidatePadronCSV(csv, KNOWN_BRIGADES);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.code).toBe("BRIGADE_NOT_FOUND");
    expect(result.errors[0]?.field).toBe("Brigada");
    expect(result.errors[0]?.rowNumber).toBe(2);
  });

  it("EF-23: detecta CI duplicado en el mismo archivo", () => {
    const csv = [
      "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada",
      "03080468489,Adán,Adán,Cabrera,41",
      "03080468489,Adán,Adán,Cabrera,41", // Duplicado
    ].join("\n");

    const result = parseAndValidatePadronCSV(csv, KNOWN_BRIGADES);

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === "CI_DUPLICATE_IN_FILE")).toBe(true);
  });

  it("EF-23: detecta CI que ya existe previamente en el padrón", () => {
    const existing = new Set(["03080468489"]);
    const csv = [
      "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada",
      "03080468489,Adán,Adán,Cabrera,41",
    ].join("\n");

    const result = parseAndValidatePadronCSV(csv, KNOWN_BRIGADES, existing);

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("CI_ALREADY_EXISTS");
  });

  it("rechaza archivo sin las columnas requeridas en la cabecera", () => {
    const badCsv = "Nombre,Edad,Ciudad\nJuan,20,Habana";
    const result = parseAndValidatePadronCSV(badCsv, KNOWN_BRIGADES);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("HEADER_INVALID");
  });

  it("RGF-24: valida tamaño de brigada entre 3 y 45 miembros", () => {
    expect(validateBrigadeSize("41", 2).valid).toBe(false);
    expect(validateBrigadeSize("41", 3).valid).toBe(true);
    expect(validateBrigadeSize("41", 25).valid).toBe(true);
    expect(validateBrigadeSize("41", 45).valid).toBe(true);
    expect(validateBrigadeSize("41", 46).valid).toBe(false);
  });

  it("genera plantilla oficial descargable con los encabezados requeridos", () => {
    const template = generatePadronTemplateCSV();
    expect(template).toContain("Carnet de Identidad (CI)");
    expect(template).toContain("Nombre");
    expect(template).toContain("1er. Apellido");
    expect(template).toContain("2do. Apellido");
    expect(template).toContain("Brigada");
    // Al menos 2 filas de ejemplo
    expect(template.split("\n").length).toBeGreaterThanOrEqual(3);
  });

  it("importPadronIncremental: importa únicamente los registros nuevos, omite existentes e informa votantes requeridos", () => {
    // Supongamos que ya existía Adán en el padrón
    const existingCIs = new Set(["03080468489"]);

    const newCsv = [
      "Carnet de Identidad (CI),Nombre,1er. Apellido,2do. Apellido,Brigada",
      "03080468489,Adán,Adán,Cabrera,41", // Ya existe
      "02052981315,Roxana,Almaguer,Sosa,41", // Nuevo
      "03020183061,Alejandro,Almeida,Cobas,41", // Nuevo
    ].join("\n");

    const result = importPadronIncremental(newCsv, KNOWN_BRIGADES, existingCIs, 85);

    expect(result.ok).toBe(true);
    expect(result.recordsToAdd).toHaveLength(2); // Solo Roxana y Alejandro
    expect(result.alreadyExistingCount).toBe(1); // Adán omitido sin error
    expect(result.alreadyExistingCIs).toContain("03080468489");
    expect(result.totalEligibleAfter).toBe(3); // 1 previo + 2 nuevos
    // 3 * 0.85 = 2.55 -> se requieren 3 votantes (>85%)
    expect(result.minVotesRequired).toBe(3);
  });
});
