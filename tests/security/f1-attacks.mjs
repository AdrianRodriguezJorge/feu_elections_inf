// Regresión de seguridad F1: repite los ataques del informe de auditoría
// (auditoria/informe-auditoria-2026-11-13.md, §4.1) contra un servidor en marcha
// y comprueba que todos fallan, además de los flujos legítimos.
//
// Uso (servidor de desarrollo sobre una BD recién sembrada, NUNCA producción):
//   node tests/security/f1-attacks.mjs [http://localhost:3005]
//
// Escribe datos (activa una cuenta, abre la votación y emite un voto), así que
// la BD debe resembrarse después.

const BASE = process.argv[2] ?? "http://localhost:3005";
let failures = 0;

function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${condition || !detail ? "" : `  -> ${detail}`}`);
  if (!condition) failures++;
}

/** Cliente con tarro de cookies mínimo. */
function client() {
  const jar = new Map();
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  async function request(path, init = {}) {
    const res = await fetch(BASE + path, {
      redirect: "manual",
      ...init,
      headers: { ...(init.headers ?? {}), cookie: cookieHeader() },
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1));
    }
    return res;
  }
  async function json(path, init = {}) {
    const res = await request(path, init);
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  }
  async function post(path, data) {
    return json(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  }
  /** Inicio de sesión con Auth.js. Devuelve el código de error o null si entra. */
  async function login(identifier, password, totp = "") {
    const { body } = await json("/api/auth/csrf");
    const form = new URLSearchParams({ csrfToken: body.csrfToken, identifier, password, totp });
    const res = await request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const location = res.headers.get("location") ?? "";
    if (location.includes("error=")) return new URL(location, BASE).searchParams.get("code") ?? "error";
    const session = await json("/api/auth/session");
    return session.body?.user?.ci ? null : "no_session";
  }
  return { request, json, post, login, jar };
}

async function devTotp(identifier) {
  const res = await fetch(`${BASE}/api/auth/totp/current?id=${encodeURIComponent(identifier)}`);
  return res.ok ? (await res.json()).token : null;
}

const CARLOS = { ci: "98021411223", name: "Carlos Mendoza Ramos", password: "Prueba2026x" };
const KATIA_CI = "97070710293";

// --- S1/S3: sin sesión no se lee ni se cambia nada --------------------------
const anon = client();
let r = await anon.json("/api/eleccion/estado");
check("S3 GET /api/eleccion/estado sin sesión → 401", r.status === 401, `status ${r.status}`);
r = await anon.post("/api/eleccion/estado", { action: "ABRIR" });
check("S1 abrir votación sin sesión → 401", r.status === 401, `status ${r.status}`);
r = await anon.post("/api/eleccion/estado", { action: "SET_STATUS", status: "FINALIZADA" });
check("S1 SET_STATUS ya no existe (422)", r.status === 422, `status ${r.status}`);
r = await anon.post("/api/voto/emitir", { voterCi: KATIA_CI, selections: [] });
check("S2 votar sin sesión → 401", r.status === 401, `status ${r.status}`);
for (const path of ["/api/auditoria", "/api/padron/import", "/api/brigadas", "/api/eleccion/config"]) {
  r = await anon.json(path);
  check(`S1 GET ${path} sin sesión → 401`, r.status === 401, `status ${r.status}`);
}

// --- S5: el TOTP no se filtra -------------------------------------------------
r = await anon.json("/api/auth/totp/current");
check("S5 TOTP sin identificador → 404 y sin secreto", r.status === 404 && !r.body?.mfaSecretPreview, `status ${r.status}`);

// --- S6/S9: contraseñas genéricas y búsqueda por subcadena -------------------
const attacker = client();
check("S6 'Adrian' + 'Admin1234!' rechazado", (await attacker.login("Adrian", "Admin1234!")) === "credentials");
check("S9 'a' + contraseña genérica no resuelve a nadie", (await attacker.login("a", "Votante1234!")) === "credentials");
check("L1 elector sin activar no entra con su carnet", (await attacker.login(CARLOS.name, CARLOS.ci)) === "not_activated");

// --- S8: cookie falsificada ----------------------------------------------------
const forger = client();
forger.jar.set("authjs.session-token", Buffer.from('{"role":"ADMIN","ci":"0"}').toString("base64"));
r = await forger.json("/api/eleccion/estado");
check("S8 cookie de sesión falsificada → 401", r.status === 401, `status ${r.status}`);

// --- Activación con ventana y alerta -----------------------------------------
r = await anon.post("/api/cuenta/activar", { ci: CARLOS.ci, password: CARLOS.ci });
check("Activación rechaza contraseña igual al carnet (422)", r.status === 422, `status ${r.status}`);
r = await anon.post("/api/cuenta/activar", { ci: CARLOS.ci, password: CARLOS.password });
check("Activación válida → 200", r.status === 200, JSON.stringify(r.body));
r = await anon.post("/api/cuenta/activar", { ci: CARLOS.ci, password: "OtraClave99" });
check("Segunda activación → 409 con aviso a la Comisión", r.status === 409 && /Comisión/.test(r.body?.error ?? ""), `status ${r.status}`);

// --- Elector autenticado --------------------------------------------------------
const voter = client();
check("Elector activado inicia sesión", (await voter.login(CARLOS.ci, CARLOS.password)) === null);
r = await voter.json("/api/eleccion/estado");
check("Estado del elector sin listado de electores", r.status === 200 && r.body && !("electors" in r.body));
check("Estado del elector sin carnets de candidatos", r.body?.candidates?.every((c) => c.ci === ""));
check("Estado del elector incluye solo su ficha", r.body?.me?.name === CARLOS.name);
const candidates = r.body?.candidates ?? [];
r = await voter.post("/api/eleccion/estado", { action: "ABRIR" });
check("Un elector no puede abrir la votación (403)", r.status === 403, `status ${r.status}`);

// --- Autoridad con segundo factor --------------------------------------------
const liz = client();
check("Liz sin TOTP → se pide el código", (await liz.login("Liz", "06091668099")) === "totp_required");
check("Liz con TOTP incorrecto → rechazado", (await liz.login("Liz", "06091668099", "000000")) === "totp_invalid");
const lizCode = await devTotp("Liz");
check("Liz con TOTP válido entra", lizCode !== null && (await liz.login("Liz", "06091668099", lizCode)) === null);
r = await liz.post("/api/cuenta/restablecer", { ci: KATIA_CI });
check("Restablecer cuenta no activada → 404", r.status === 404, `status ${r.status}`);
r = await liz.post("/api/eleccion/estado", { action: "ABRIR" });
check("La Comisión abre la votación", r.status === 200, JSON.stringify(r.body));
r = await anon.post("/api/cuenta/activar", { ci: KATIA_CI, password: "Prueba2026k" });
check("Activación fuera de plazo (votación abierta) → 409", r.status === 409, `status ${r.status}`);

// --- S2: el voto usa la identidad de la sesión ---------------------------------
const [c1, c2] = candidates;
const selections = [
  { processCandidateId: c1.candidateId, member: true, president: true },
  { processCandidateId: c2.candidateId, member: true, president: false },
];
r = await voter.post("/api/voto/emitir", { voterCi: KATIA_CI, role: "COMMISSION", selections });
check("S2 voto aceptado ignorando voterCi/role del cuerpo", r.status === 200, JSON.stringify(r.body));
const receipt = r.body?.receiptHash ?? "";
check("S12 comprobante de 64 hex", /^[0-9a-f]{64}$/.test(receipt));
r = await voter.post("/api/voto/emitir", { selections });
check("Segundo voto del mismo elector rechazado", r.status === 422, `status ${r.status}`);
r = await voter.json("/api/eleccion/estado");
check("La ficha del elector queda como 'ya votó'", r.body?.me?.hasVoted === true);

// --- S3/L3: el comprobante solo confirma inclusión ------------------------------
r = await anon.json(`/api/voto/comprobante?hash=${receipt}`);
check("Comprobante encontrado (consulta pública)", r.status === 200 && r.body?.found === true);
check("Comprobante sin contenido ni estado ni hora", r.body && !("ballot" in r.body) && !("selections" in r.body));

// --- Transiciones ------------------------------------------------------------
r = await liz.post("/api/eleccion/estado", { action: "CERRAR" });
check("La Comisión cierra la votación", r.status === 200);
r = await liz.post("/api/eleccion/estado", { action: "ABRIR" });
check("L-5 no se puede reabrir una votación cerrada (409)", r.status === 409, `status ${r.status}`);

console.log(failures === 0 ? "\nTodo en verde." : `\n${failures} comprobación(es) fallida(s).`);
process.exit(failures === 0 ? 0 : 1);
