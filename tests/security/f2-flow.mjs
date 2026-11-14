// Regresión F2: jornada electoral completa contra un servidor en marcha y una
// BD recién sembrada (NUNCA producción).
//   node tests/security/f2-flow.mjs [http://localhost:3005]
//
// Cubre: excepción de quórum (solo Admin), votación con >85 %, empate en la
// presidencia resuelto por la Comisión con acta, escrutinio único, VP,
// vacante presidencial, nuevo VP e integridad de la cadena de auditoría.

import { activate, AUTHORITIES, AUTHORITY_PASSWORD, client as makeClient } from "./client.mjs";

const BASE = process.argv[2] ?? "http://localhost:3005";
const client = () => makeClient(BASE);
for (const ci of Object.values(AUTHORITIES)) await activate(BASE, ci, AUTHORITY_PASSWORD);
let failures = 0;
function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${condition || !detail ? "" : `  -> ${detail}`}`);
  if (!condition) failures++;
}

const VOTERS = [
  "98021411223", "98052122334", "98081533445", "98110344556", "99031255667",
  "99062566778", "99090877889", "99101988990", "99120499001", "97070710293",
];
const PASSWORD = "Prueba2026x";

const admin = client();
const liz = client();
const revisor = client();
check("Admin entra", (await admin.login("Adrian", AUTHORITY_PASSWORD)) === null);
check("Liz entra", (await liz.login("Liz", AUTHORITY_PASSWORD)) === null);
check("Revisor entra", (await revisor.login("Revisor", AUTHORITY_PASSWORD)) === null);

// --- Excepción de quórum ----------------------------------------------------
let r = await liz.post("/api/eleccion/quorum", { pct: 80, justification: "Prueba de permisos", acta: "A-1" });
check("La Comisión no puede cambiar el quórum (403)", r.status === 403, `status ${r.status}`);
r = await admin.post("/api/eleccion/quorum", { pct: 70, justification: "Fuera de rango legal", acta: "A-1" });
check("Quórum por debajo de 80 % rechazado (422)", r.status === 422, `status ${r.status}`);
r = await admin.post("/api/eleccion/quorum", {
  pct: 80,
  justification: "Excepción aprobada por el Secretariado",
  acta: "Res. 12/2026",
});
check("El Admin aplica la excepción al 80 %", r.status === 200, JSON.stringify(r.body));
r = await liz.json("/api/eleccion/estado");
check(
  "La excepción es visible para todos",
  r.body?.quorum?.effectivePct === 80 && r.body?.quorum?.exception?.acta === "Res. 12/2026",
);
r = await admin.post("/api/eleccion/quorum", { pct: 85, justification: "Se restablece la regla general", acta: "Res. 13/2026" });
check("85 % restablece la regla general", r.status === 200);

// --- Votación ----------------------------------------------------------------
const voters = [];
for (const ci of VOTERS) {
  await fetch(`${BASE}/api/cuenta/activar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ci, password: PASSWORD }),
  });
  const v = client();
  if ((await v.login(ci, PASSWORD)) === null) voters.push(v);
}
check("Los 10 electores activan y entran", voters.length === 10, `entraron ${voters.length}`);

r = await liz.post("/api/escrutinio", {});
check("No se puede escrutar antes de cerrar (409)", r.status === 409, `status ${r.status}`);
check("Abrir votación", (await liz.post("/api/eleccion/estado", { action: "ABRIR" })).status === 200);

const candidates = (await liz.json("/api/eleccion/estado")).body.candidates.map((c) => c.candidateId);
const [p1, p2] = candidates;
// Todos marcan a los 8 primeros (corte limpio); la presidencia se reparte 6 y 6 → empate.
const ballotFor = (president) =>
  candidates.slice(0, 8).map((id) => ({ processCandidateId: id, member: true, president: id === president }));
const everyone = [...voters, liz, revisor];
let ok = 0;
for (let i = 0; i < everyone.length; i++) {
  const res = await everyone[i].post("/api/voto/emitir", { selections: ballotFor(i % 2 === 0 ? p1 : p2) });
  if (res.status === 200) ok++;
}
check("12 de 13 electores votan (92 %)", ok === 12, `votaron ${ok}`);
r = await admin.post("/api/voto/emitir", { selections: ballotFor(p1) });
check("El Admin no vota (rol sin permiso, 403)", r.status === 403, `status ${r.status}`);

check("Cerrar votación", (await liz.post("/api/eleccion/estado", { action: "CERRAR" })).status === 200);
r = await liz.post("/api/eleccion/estado", { action: "ABRIR" });
check("No se reabre (409)", r.status === 409);

// --- Escrutinio y empate -----------------------------------------------------
r = await liz.post("/api/escrutinio", {});
check(
  "Escrutinio → EMPATE en la presidencia",
  r.status === 200 && r.body?.processStatus === "EMPATE" && r.body?.tally?.tie?.type === "PRESIDENT",
  JSON.stringify(r.body?.processStatus ?? r.body),
);
r = await liz.post("/api/escrutinio", {});
check("El escrutinio no se repite (409)", r.status === 409, `status ${r.status}`);

const voterView = await voters[0].json("/api/eleccion/estado");
check("Con empate pendiente el votante no ve resultados", voterView.body?.tallyResult === null);

r = await liz.post("/api/comision/designar-vp", { candidateId: candidates[2] });
check("No se designa VP con empate pendiente (409)", r.status === 409, `status ${r.status}`);
r = await liz.post("/api/escrutinio/empate", {
  presidentId: candidates[5],
  justification: "Intento con un no empatado",
  acta: "AC-7",
});
check("La Comisión solo elige entre empatados (422)", r.status === 422, `status ${r.status}`);
r = await liz.post("/api/escrutinio/empate", { presidentId: p2 });
check("La decisión exige motivo y acta (422)", r.status === 422);
r = await liz.post("/api/escrutinio/empate", {
  presidentId: p2,
  justification: "Acuerdo unánime de la Comisión",
  acta: "AC-7/2026",
});
check("Empate resuelto → PROCLAMADA", r.status === 200 && r.body?.tally?.presidentId === p2, JSON.stringify(r.body));

r = await voters[0].json("/api/eleccion/estado");
check(
  "Proclamado: el votante ve resultados y la decisión de la Comisión",
  r.body?.tallyResult?.presidentId === p2 && r.body?.tieResolution?.acta === "AC-7/2026",
);

// --- VP y vacantes -----------------------------------------------------------
r = await liz.post("/api/comision/designar-vp", { candidateId: p2 });
check("El presidente no puede ser VP (422)", r.status === 422);
r = await liz.post("/api/comision/designar-vp", { candidateId: candidates[2] });
check("VP designado", r.status === 200, JSON.stringify(r.body));
r = await liz.post("/api/comision/vacante", {
  type: "VACANCIA_PRESIDENTE",
  reason: "DIMISION_VOLUNTARIA",
  justification: "Renuncia por motivos académicos",
});
check(
  "Vacante presidencial: asume el VP",
  r.status === 200 && r.body?.composition?.president?.candidateId === candidates[2],
  JSON.stringify(r.body),
);
r = await liz.post("/api/comision/vacante", {
  type: "DESIGNAR_NUEVO_VP",
  successorCandidateId: candidates[3],
  justification: "Designación del nuevo VP",
});
check("Nuevo VP → FINALIZADA", r.status === 200 && r.body?.composition?.vicePresident?.candidateId === candidates[3], JSON.stringify(r.body));

r = await liz.json("/api/eleccion/estado");
check(
  "Estado final FINALIZADA con composición persistida",
  r.body?.summary?.status === "FINALIZADA" && r.body?.composition?.version === 3,
  JSON.stringify({ s: r.body?.summary?.status, v: r.body?.composition?.version }),
);

// --- Auditoría -----------------------------------------------------------------
r = await liz.json("/api/auditoria");
check("Cadena de auditoría íntegra", r.body?.chainIntegrity?.valid === true, JSON.stringify(r.body?.chainIntegrity));

console.log(failures === 0 ? "\nTodo en verde." : `\n${failures} comprobación(es) fallida(s).`);
process.exit(failures === 0 ? 0 : 1);
