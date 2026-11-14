/**
 * Regresión de seguridad (F1): los ataques del informe de auditoría
 * (auditoria/informe-auditoria-2026-11-13.md §4.1) deben fallar.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { activate, AUTHORITIES, AUTHORITY_PASSWORD, client, Client, resetDb, VOTER_PASSWORD } from "./helpers";

const CARLOS = { ci: "98021411223", name: "Carlos Mendoza Ramos" };
const KATIA_CI = "97070710293";

describe("Seguridad: sin sesión no se lee ni se cambia nada (S1, S3)", () => {
  beforeAll(async () => resetDb());

  it("el estado de la elección exige sesión", async () => {
    expect((await client().json("/api/eleccion/estado")).status).toBe(401);
  });

  it.each(["/api/auditoria", "/api/padron/import", "/api/brigadas", "/api/comision"])("GET %s exige sesión", async (path) => {
    expect((await client().json(path)).status).toBe(401);
  });

  it("abrir la votación o votar sin sesión → 401", async () => {
    const anon = client();
    expect((await anon.post("/api/eleccion/estado", { action: "ABRIR" })).status).toBe(401);
    expect((await anon.post("/api/voto/emitir", { selections: [] })).status).toBe(401);
  });

  it("las acciones REINICIAR y SET_STATUS ya no existen", async () => {
    const anon = client();
    expect((await anon.post("/api/eleccion/estado", { action: "REINICIAR" })).status).toBe(422);
    expect((await anon.post("/api/eleccion/estado", { action: "SET_STATUS", status: "FINALIZADA" })).status).toBe(422);
  });

  it("el código TOTP no se expone (S5)", async () => {
    const r = await client().json("/api/auth/totp/current?id=Liz");
    expect(r.status).toBe(404);
    expect(JSON.stringify(r.body ?? {})).not.toMatch(/token|mfaSecret/);
  });
});

describe("Seguridad: credenciales y sesión (S6, S8, S9)", () => {
  it("las contraseñas genéricas antiguas no sirven", async () => {
    await activate(AUTHORITIES.Adrian, AUTHORITY_PASSWORD);
    expect(await client().login("Adrian", "Admin1234!")).toBe("credentials");
  });

  it("una subcadena del nombre no identifica a nadie", async () => {
    expect(await client().login("a", "Votante1234!")).toBe("credentials");
  });

  it("un elector sin activar no entra con su carnet", async () => {
    expect(await client().login(CARLOS.name, CARLOS.ci)).toBe("not_activated");
  });

  it("una cookie de sesión falsificada no autentica", async () => {
    const forger = client();
    forger.jar.set("authjs.session-token", Buffer.from('{"role":"ADMIN","ci":"0"}').toString("base64"));
    expect((await forger.json("/api/eleccion/estado")).status).toBe(401);
  });
});

describe("Activación de cuentas con ventana y aviso", () => {
  it("rechaza una contraseña igual al carnet", async () => {
    expect(await activate(CARLOS.ci, CARLOS.ci)).toBe(422);
  });

  it("activa una vez y avisa si alguien intenta activarla de nuevo", async () => {
    expect(await activate(CARLOS.ci, VOTER_PASSWORD)).toBe(200);
    const again = await client().post("/api/cuenta/activar", { ci: CARLOS.ci, password: "OtraClave99" });
    expect(again.status).toBe(409);
    expect(again.body.error).toMatch(/Comisión/);
  });
});

describe("Elector y autoridad autenticados (S2, S3)", () => {
  let voter: Client;
  let liz: Client;
  let candidates: Array<{ candidateId: string; ci: string }>;

  beforeAll(async () => {
    voter = client();
    expect(await voter.login(CARLOS.ci, VOTER_PASSWORD)).toBeNull();
    await activate(AUTHORITIES.Liz, AUTHORITY_PASSWORD);
    liz = client();
    expect(await liz.login("Liz", AUTHORITY_PASSWORD)).toBeNull();
  });

  it("el elector recibe solo su ficha: ni listado de electores ni carnets de candidatos", async () => {
    const r = await voter.json("/api/eleccion/estado");
    expect(r.status).toBe(200);
    expect(r.body).not.toHaveProperty("electors");
    expect(r.body.me.name).toBe(CARLOS.name);
    candidates = r.body.candidates;
    expect(candidates.every((c) => c.ci === "")).toBe(true);
  });

  it("un elector no puede abrir la votación (403)", async () => {
    expect((await voter.post("/api/eleccion/estado", { action: "ABRIR" })).status).toBe(403);
  });

  it("la Comisión abre y el plazo de activación se cierra", async () => {
    expect((await liz.post("/api/eleccion/estado", { action: "ABRIR" })).status).toBe(200);
    expect(await activate(KATIA_CI, "Prueba2026k")).toBe(409);
  });

  it("el voto usa la identidad de la sesión, no el cuerpo, y solo se vota una vez", async () => {
    const [c1, c2] = candidates;
    const selections = [
      { processCandidateId: c1!.candidateId, member: true, president: true },
      { processCandidateId: c2!.candidateId, member: true, president: false },
    ];
    const r = await voter.post("/api/voto/emitir", { voterCi: KATIA_CI, role: "COMMISSION", selections });
    expect(r.status).toBe(200);
    expect(r.body.receiptHash).toMatch(/^[0-9a-f]{64}$/);
    expect((await voter.post("/api/voto/emitir", { selections })).status).toBe(422);
    expect((await voter.json("/api/eleccion/estado")).body.me.hasVoted).toBe(true);

    // El comprobante solo confirma inclusión (receipt-freeness).
    const receipt = await client().json(`/api/voto/comprobante?hash=${r.body.receiptHash}`);
    expect(receipt.status).toBe(200);
    expect(receipt.body.found).toBe(true);
    expect(receipt.body).not.toHaveProperty("ballot");
    expect(receipt.body).not.toHaveProperty("selections");
  });

  it("una votación cerrada no se reabre", async () => {
    expect((await liz.post("/api/eleccion/estado", { action: "CERRAR" })).status).toBe(200);
    expect((await liz.post("/api/eleccion/estado", { action: "ABRIR" })).status).toBe(409);
  });
});

describe("Rutas protegidas en el servidor (F7)", () => {
  it("sin sesión, las páginas privadas redirigen al inicio", async () => {
    const res = await client().request("/comision");
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") ?? "", "http://x").pathname).toBe("/");
  });

  it("un elector que pide /comision acaba en /votar", async () => {
    const voter = client();
    expect(await voter.login(CARLOS.ci, VOTER_PASSWORD)).toBeNull();
    const res = await voter.request("/comision");
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") ?? "", "http://x").pathname).toBe("/votar");
  });

  it("verificar y reglamento son públicos", async () => {
    expect((await client().request("/verificar")).status).toBe(200);
    expect((await client().request("/reglamento")).status).toBe(200);
  });
});
