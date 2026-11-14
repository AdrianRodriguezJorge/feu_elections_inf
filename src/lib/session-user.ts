import type { UserRole } from "@/domain/types";

/** Usuario autenticado tal como lo ve la interfaz (sin datos sensibles). */
export interface SessionUser {
  ci: string;
  name: string;
  role: UserRole;
}

/** Códigos de error del inicio de sesión que la interfaz sabe explicar. */
export type LoginErrorCode =
  | "credentials"
  | "totp_required"
  | "totp_invalid"
  | "mfa_not_configured"
  | "not_activated"
  | "ambiguous_name"
  | "rate_limited";
