/**
 * Autenticación con Auth.js (Credentials + JWT en cookie cifrada).
 *
 *  - Identificador: carnet de identidad o nombre completo exacto.
 *  - Contraseña: la elegida por el elector al activar su cuenta.
 *  - ADMIN y COMMISSION: segundo factor TOTP con secreto propio (activable con
 *    AUTH_MFA_ENABLED=true; desactivado por ahora, decisión F2).
 *
 * Los errores devuelven un `code` estable que la interfaz traduce; el error
 * genérico "credentials" no revela si el usuario existe.
 */

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { verifyPassword, verifyTotpToken } from "@/domain/auth";
import type { UserRole } from "@/domain/types";
import type { LoginErrorCode, SessionUser } from "@/lib/session-user";
import { findLoginAccount } from "@/server/accounts";
import { recordAudit } from "@/server/election-service";
import { checkRateLimit } from "@/server/rate-limiter";
import { clientIp } from "@/server/request";

class LoginError extends CredentialsSignin {
  constructor(code: LoginErrorCode) {
    super();
    this.code = code;
  }
}

const credentialsSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(128),
  totp: z.string().trim().max(6).optional(),
});

const MFA_ROLES: readonly UserRole[] = ["ADMIN", "COMMISSION"];

/**
 * Segundo factor TOTP para autoridades. DESACTIVADO por decisión del usuario
 * (F2) hasta definir el enrolamiento; se reactiva con AUTH_MFA_ENABLED=true.
 */
const MFA_ENABLED = process.env.AUTH_MFA_ENABLED === "true";

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [
    Credentials({
      credentials: { identifier: {}, password: {}, totp: {} },
      async authorize(raw, request) {
        const rl = checkRateLimit(`login:${clientIp(request.headers)}`, 20, 60_000);
        if (!rl.allowed) throw new LoginError("rate_limited");

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) throw new LoginError("credentials");
        const { identifier, password, totp } = parsed.data;

        const lookup = await findLoginAccount(identifier);
        if (lookup.status === "ambiguous") throw new LoginError("ambiguous_name");
        if (lookup.status === "not_activated") throw new LoginError("not_activated");
        if (lookup.status === "not_found") throw new LoginError("credentials");

        const { account } = lookup;
        if (!verifyPassword(password, account.passwordHash)) throw new LoginError("credentials");

        const mfaRequired = MFA_ENABLED && MFA_ROLES.includes(account.role);
        if (mfaRequired) {
          if (!account.mfaSecret) throw new LoginError("mfa_not_configured");
          if (!totp) throw new LoginError("totp_required");
          if (!verifyTotpToken(totp, account.mfaSecret)) throw new LoginError("totp_invalid");
        }

        await recordAudit(account.ci, account.role, "INICIO_SESION", {
          mfaVerified: mfaRequired,
        });

        return { id: account.id, name: account.name, ci: account.ci, role: account.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & { ci: string; role: UserRole };
        token.ci = u.ci;
        token.role = u.role;
        token.name = u.name ?? u.ci;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        ci: String(token.ci ?? ""),
        name: String(token.name ?? ""),
        role: token.role as UserRole,
      };
      return session;
    },
  },
});
