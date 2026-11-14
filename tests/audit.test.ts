import { describe, expect, it } from "vitest";
import {
  appendAuditEntry,
  canonicalJsonStringify,
  verifyAuditChainIntegrity,
  AuditLogEntry,
} from "@/domain/audit";

describe("Registro WORM y Cadena de Auditoría Inmutable (Art. 66 / RGF-33)", () => {
  it("crea una cadena de eventos encadenada por SHA-256", () => {
    let chain: AuditLogEntry[] = [];

    const ev1 = appendAuditEntry(chain, "02031194852", "COMMISSION", "PROCESO_CREADO", { year: 2026 });
    chain.push(ev1);

    const ev2 = appendAuditEntry(chain, "03080468489", "VOTER", "BOLETA_EMITIDA", { status: "VALIDA" });
    chain.push(ev2);

    const ev3 = appendAuditEntry(chain, "02031194852", "COMMISSION", "VOTACION_CERRADA", {});
    chain.push(ev3);

    expect(chain).toHaveLength(3);
    expect(chain[0]?.sequence).toBe(1);
    expect(chain[1]?.sequence).toBe(2);
    expect(chain[2]?.sequence).toBe(3);

    // El segundo evento apunta al hash del primero
    expect(chain[1]?.prevHash).toBe(chain[0]?.hash);
    expect(chain[2]?.prevHash).toBe(chain[1]?.hash);

    // Verificación de integridad
    const check = verifyAuditChainIntegrity(chain);
    expect(check.valid).toBe(true);
  });

  it("detecta manipulación o alteración de datos en un evento anterior", () => {
    let chain: AuditLogEntry[] = [];
    chain.push(appendAuditEntry(chain, "02031194852", "COMMISSION", "PROCESO_CREADO", { year: 2026 }));
    chain.push(appendAuditEntry(chain, "03080468489", "VOTER", "BOLETA_EMITIDA", { status: "VALIDA" }));

    // Intento malicioso de modificar los detalles del evento 1
    chain[0]!.details = { year: 2030, hacked: true };

    const check = verifyAuditChainIntegrity(chain);
    expect(check.valid).toBe(false);
    expect(check.error).toContain("Contenido manipulado");
    expect(check.brokenSequence).toBe(1);
  });

  it("detecta eliminación de un eslabón intermedio", () => {
    let chain: AuditLogEntry[] = [];
    chain.push(appendAuditEntry(chain, "01", "ADMIN", "PROCESO_CREADO", {}));
    chain.push(appendAuditEntry(chain, "02", "COMMISSION", "VOTACION_ABIERTA", {}));
    chain.push(appendAuditEntry(chain, "03", "VOTER", "BOLETA_EMITIDA", {}));

    // Eliminar el segundo evento
    const tampered = [chain[0]!, chain[2]!];

    const check = verifyAuditChainIntegrity(tampered);
    expect(check.valid).toBe(false);
    expect(check.error).toContain("Secuencia rota");
  });
});


describe("Serialización canónica tras la ida y vuelta por JSONB (regresión F1)", () => {
  it("una clave con valor undefined no cambia el hash del evento", () => {
    const enMemoria = { version: 2, presidentId: "can-03", vicePresidentId: undefined };
    const trasJsonb = JSON.parse(JSON.stringify(enMemoria)) as Record<string, unknown>;
    expect(canonicalJsonStringify(enMemoria)).toBe(canonicalJsonStringify(trasJsonb));

    const entry = appendAuditEntry([], "SYSTEM", "ADMIN", "COMPOSICION_SECRETARIADO_ACTUALIZADA", enMemoria);
    const recargado = { ...entry, details: trasJsonb };
    expect(verifyAuditChainIntegrity([recargado]).valid).toBe(true);
  });
});
