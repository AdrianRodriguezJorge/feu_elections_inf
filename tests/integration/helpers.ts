/**
 * Utilidades de los tests de integraciÃ³n: cliente HTTP con cookies, inicio de
 * sesiÃ³n con Auth.js, activaciÃ³n de cuentas y reinicio de la BD de pruebas.
 */

import { execSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

export const BASE = process.env.APP_URL ?? "http://localhost:3000";

export const AUTHORITY_PASSWORD = "Autoridad2026x";
export const VOTER_PASSWORD = "Prueba2026x";
export const AUTHORITIES = { Adrian: "99091978927", Liz: "06091668099", Revisor: "04021514560" } as const;
export const VOTERS = [
  "98021411223", "98052122334", "98081533445", "98110344556", "99031255667",
  "99062566778", "99090877889", "99101988990", "99120499001", "97070710293",
] as const;

/**
 * Reinicia la BD de pruebas: borra el esquema, aplica las migraciones y siembra.
 * Solo con ALLOW_DB_RESET=true: nunca debe apuntar a producciÃ³n.
 */
export async function resetDb(): Promise<void> {
  if (process.env.ALLOW_DB_RESET !== "true") {
    throw new Error("Los tests de integraciÃ³n reinician la BD: define ALLOW_DB_RESET=true solo en una BD de pruebas.");
  }
  await db().$executeRawUnsafe(`DROP SCHEMA IF EXISTS "public" CASCADE`);
  await db().$executeRawUnsafe(`CREATE SCHEMA "public"`);
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}

let prisma: PrismaClient | null = null;
export function db(): PrismaClient {
  prisma ??= new PrismaClient();
  return prisma;
}

export interface JsonResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

/**
 * Cliente con tarro de cookies. Cada cliente usa una IP simulada propia para
 * no compartir el lÃ­mite de intentos (en Vercel `x-real-ip` lo fija la plataforma).
 */
export function client() {
  const jar = new Map<string, string>();
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(BASE + path, {
      redirect: "manual",
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), cookie: cookieHeader(), "x-real-ip": ip },
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair = ""] = c.split(";");
      const idx = pair.indexOf("=");
      jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1));
    }
    return res;
  }

  async function json(path: string, init: RequestInit = {}): Promise<JsonResponse> {
    const res = await request(path, init);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  }

  function post(path: string, data: unknown): Promise<JsonResponse> {
    return json(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  }

  /** Inicia sesiÃ³n. Devuelve el cÃ³digo de error de Auth.js o null si entra. */
  async function login(identifier: string, password: string, totp = ""): Promise<string | null> {
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

export type Client = ReturnType<typeof client>;

export async function activate(ci: string, password: string): Promise<number> {
  return (await client().post("/api/cuenta/activar", { ci, password })).status;
}

/** Activa las tres autoridades del seed y devuelve sus sesiones. */
export async function authorities() {
  for (const ci of Object.values(AUTHORITIES)) await activate(ci, AUTHORITY_PASSWORD);
  const admin = client();
  const liz = client();
  const revisor = client();
  await admin.login("Adrian", AUTHORITY_PASSWORD);
  await liz.login("Liz", AUTHORITY_PASSWORD);
  await revisor.login("Revisor", AUTHORITY_PASSWORD);
  return { admin, liz, revisor };
}
