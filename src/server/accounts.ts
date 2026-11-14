/**
 * Cuentas de usuario: identificación para el inicio de sesión, activación por
 * el elector y restablecimiento por la Comisión.
 *
 * Modelo de activación (decisión F1):
 *  - El elector activa su cuenta con su Carnet de Identidad y elige una
 *    contraseña propia, distinta del carnet.
 *  - Solo se puede activar en la ventana previa a la apertura de la votación.
 *  - Si alguien ya activó la cuenta, se avisa al elector para que lo reporte;
 *    la Comisión puede restablecerla antes de abrir.
 *
 * Una cuenta "activada" es un usuario con `passwordHash`. Las cuentas de
 * elector cuya contraseña sigue siendo su propio carnet (datos provisionales
 * anteriores a F1) se tratan como no activadas.
 */

import { prisma } from "@/server/db";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/domain/auth";
import { validateCI } from "@/domain/ci";
import type { ProcessStatus, UserRole } from "@/domain/types";

/** Estados en los que el elector puede activar su cuenta o la Comisión restablecerla. */
export const ACTIVATION_WINDOW: readonly ProcessStatus[] = ["CONVOCADO"];

export interface LoginAccount {
  id: string;
  ci: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  mfaSecret: string | null;
}

export type LoginLookup =
  | { status: "ok"; account: LoginAccount }
  | { status: "not_found" }
  | { status: "ambiguous" }
  | { status: "not_activated" };

const CI_PATTERN = /^\d{11}$/;

/** Indica si la contraseña guardada es todavía el propio carnet (cuenta provisional). */
function isProvisionalVoter(role: UserRole, ci: string, passwordHash: string): boolean {
  return role === "VOTER" && verifyPassword(ci, passwordHash);
}

/**
 * Localiza la cuenta por carnet (11 dígitos) o por nombre completo exacto,
 * sin distinguir mayúsculas. Nunca por subcadena.
 */
export async function findLoginAccount(identifier: string): Promise<LoginLookup> {
  const clean = identifier.trim().replace(/\s+/g, " ");
  if (!clean) return { status: "not_found" };

  let ci: string | null = null;

  if (CI_PATTERN.test(clean)) {
    ci = clean;
  } else {
    const users = await prisma.user.findMany({
      where: { name: { equals: clean, mode: "insensitive" } },
      select: { ci: true },
      take: 2,
    });
    if (users.length > 1) return { status: "ambiguous" };
    if (users.length === 1 && users[0]!.ci) {
      ci = users[0]!.ci;
    } else {
      const members = await prisma.membership.findMany({
        where: { fullName: { equals: clean, mode: "insensitive" } },
        select: { studentId: true },
        take: 2,
      });
      if (members.length > 1) return { status: "ambiguous" };
      if (members.length === 1) ci = members[0]!.studentId;
    }
  }

  if (!ci) return { status: "not_found" };

  const user = await prisma.user.findUnique({ where: { ci } });
  if (!user) {
    const member = await prisma.membership.findFirst({ where: { studentId: ci, eligible: true } });
    return member ? { status: "not_activated" } : { status: "not_found" };
  }
  if (!user.active) return { status: "not_found" };

  const role = user.role as UserRole;
  if (!user.passwordHash || isProvisionalVoter(role, ci, user.passwordHash)) {
    return { status: "not_activated" };
  }

  return {
    status: "ok",
    account: {
      id: user.id,
      ci,
      name: user.name,
      role,
      passwordHash: user.passwordHash,
      mfaSecret: user.mfaSecret,
    },
  };
}

export type ActivationResult =
  | { ok: true; name: string }
  | { ok: false; status: number; error: string };

/**
 * Activa la cuenta de un elector del padrón con una contraseña elegida por él.
 */
export async function activateAccount(
  ci: string,
  password: string,
  processStatus: ProcessStatus,
): Promise<ActivationResult> {
  if (!ACTIVATION_WINDOW.includes(processStatus)) {
    return {
      ok: false,
      status: 409,
      error:
        "El plazo de activación terminó: las cuentas solo se activan antes de abrir la votación. Contacte a la Comisión Electoral.",
    };
  }

  const ciCheck = validateCI(ci);
  if (!ciCheck.valid) {
    return { ok: false, status: 422, error: ciCheck.error ?? "El carnet de identidad no es válido." };
  }

  if (password === ci) {
    return { ok: false, status: 422, error: "La contraseña no puede ser su carnet de identidad." };
  }
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return { ok: false, status: 422, error: strength.error ?? "La contraseña no es válida." };
  }

  const membership = await prisma.membership.findFirst({ where: { studentId: ci } });
  if (!membership || !membership.eligible) {
    return {
      ok: false,
      status: 404,
      error: "Este carnet no figura como elector habilitado. Si cree que es un error, contacte a la Comisión Electoral.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { ci } });
  if (existing?.passwordHash && !isProvisionalVoter(existing.role as UserRole, ci, existing.passwordHash)) {
    return {
      ok: false,
      status: 409,
      error:
        "Esta cuenta ya fue activada. Si no fue usted, avise a la Comisión Electoral para que la restablezca antes de que abra la votación.",
    };
  }

  const passwordHash = hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { passwordHash, active: true } })
      : await tx.user.create({
          data: {
            ci,
            name: membership.fullName,
            passwordHash,
            role: "VOTER",
            active: true,
          },
        });

    if (membership.userId !== user.id) {
      await tx.membership.update({ where: { id: membership.id }, data: { userId: user.id } });
    }
  });

  return { ok: true, name: membership.fullName };
}

export type ResetResult = { ok: true; name: string } | { ok: false; status: number; error: string };

/**
 * Restablece la activación de un elector (borra su contraseña) para que vuelva
 * a activarla. Solo cuentas de elector y solo antes de abrir la votación.
 */
export async function resetActivation(ci: string, processStatus: ProcessStatus): Promise<ResetResult> {
  if (!ACTIVATION_WINDOW.includes(processStatus)) {
    return { ok: false, status: 409, error: "Solo se pueden restablecer cuentas antes de abrir la votación." };
  }

  const user = await prisma.user.findUnique({ where: { ci: ci.trim() } });
  if (!user || !user.passwordHash) {
    return { ok: false, status: 404, error: "No hay ninguna cuenta activada con ese carnet." };
  }
  if (user.role !== "VOTER") {
    return { ok: false, status: 403, error: "Las cuentas de autoridades no se restablecen desde aquí." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: null } });
  return { ok: true, name: user.name };
}
