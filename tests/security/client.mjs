// Cliente HTTP mínimo con tarro de cookies para los scripts de regresión.

/** Cliente con tarro de cookies mínimo. */
export function client(BASE) {
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


/** Activa la cuenta de un elector o autoridad (idempotente a efectos de los scripts). */
export async function activate(BASE, ci, password) {
  const res = await fetch(`${BASE}/api/cuenta/activar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ci, password }),
  });
  return res.status;
}

/** Contraseña de prueba de las autoridades en los scripts (solo BD local de pruebas). */
export const AUTHORITY_PASSWORD = "Autoridad2026x";
export const AUTHORITIES = { Adrian: "99091978927", Liz: "06091668099", Revisor: "04021514560" };
