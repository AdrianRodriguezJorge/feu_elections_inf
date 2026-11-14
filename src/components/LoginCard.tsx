"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import type { LoginErrorCode } from "@/lib/session-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginCardProps {
  onLoginSuccess: () => void;
}

type Step = "LOGIN" | "TOTP" | "ACTIVATE";

const LOGIN_ERRORS: Record<LoginErrorCode, string> = {
  credentials: "El usuario o la contraseña no son correctos. Revíselos e inténtelo de nuevo.",
  totp_required: "Escriba el código de 6 dígitos de su aplicación de verificación.",
  totp_invalid: "El código de verificación no es correcto o ya caducó. Escriba el código que se muestra ahora.",
  mfa_not_configured:
    "Su cuenta de autoridad no tiene configurada la verificación en dos pasos. Contacte al administrador del sistema.",
  not_activated:
    "Su cuenta aún no está activada. Actívela con su carnet de identidad para elegir su contraseña.",
  ambiguous_name: "Hay más de una persona con ese nombre. Entre con su carnet de identidad.",
  rate_limited: "Demasiados intentos seguidos. Espere un minuto y vuelva a intentarlo.",
};

const CONNECTION_ERROR = "No se pudo conectar con el servidor. Revise su conexión e inténtelo de nuevo.";

export function LoginCard({ onLoginSuccess }: LoginCardProps) {
  const [step, setStep] = useState<Step>("LOGIN");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");

  const [activationCi, setActivationCi] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Solo en desarrollo local: código TOTP de prueba (ayuda interina, decisión pendiente).
  const [devTotp, setDevTotp] = useState<string | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || step !== "TOTP") {
      setDevTotp(null);
      return;
    }
    const load = () =>
      fetch(`/api/auth/totp/current?id=${encodeURIComponent(identifier.trim())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setDevTotp(d?.token ?? null))
        .catch(() => setDevTotp(null));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [step, identifier]);

  const goTo = (next: Step) => {
    setStep(next);
    setErrorMessage(null);
  };

  const errorId = errorMessage ? "login-error" : undefined;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim() || !password) {
      setErrorMessage("Escriba su carnet o nombre completo y su contraseña.");
      return;
    }
    if (step === "TOTP" && !/^\d{6}$/.test(totpToken)) {
      setErrorMessage("El código de verificación tiene 6 dígitos. Revíselo y vuelva a escribirlo.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        identifier: identifier.trim(),
        password,
        totp: step === "TOTP" ? totpToken : "",
        redirect: false,
      });

      if (res?.ok && !res.error) {
        onLoginSuccess();
        return;
      }

      const code = (res?.code ?? "credentials") as LoginErrorCode;
      if (code === "totp_required") {
        goTo("TOTP");
        return;
      }
      if (code === "not_activated") {
        setActivationCi(/^\d{11}$/.test(identifier.trim()) ? identifier.trim() : "");
      }
      setErrorMessage(LOGIN_ERRORS[code] ?? LOGIN_ERRORS.credentials);
    } catch {
      setErrorMessage(CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!/^\d{11}$/.test(activationCi.trim())) {
      setErrorMessage("El carnet de identidad debe tener 11 dígitos. Revíselo.");
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres, con letras y números.");
      return;
    }
    if (newPassword === activationCi.trim()) {
      setErrorMessage("La contraseña no puede ser su carnet de identidad. Elija otra.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Las dos contraseñas no coinciden. Escríbalas de nuevo.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cuenta/activar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ci: activationCi.trim(), password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "No se pudo activar la cuenta. Inténtelo de nuevo.");
        return;
      }
      setIdentifier(activationCi.trim());
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Cuenta activada. Ya puede iniciar sesión con su carnet y su nueva contraseña.");
      goTo("LOGIN");
    } catch {
      setErrorMessage(CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] sm:max-w-[400px]">
      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xl">
        <div className="text-center pb-3 border-b border-gray-100">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            {[
              { src: "/logos/cujae_rgba.png", alt: "CUJAE" },
              { src: "/logos/feu_512.png", alt: "FEU" },
              { src: "/logos/informatica_512.png", alt: "Facultad de Ingeniería Informática" },
            ].map((logo) => (
              <div key={logo.src} className="relative h-8 w-8 shrink-0">
                <Image src={logo.src} alt={logo.alt} fill sizes="32px" className="object-contain" priority />
              </div>
            ))}
          </div>

          <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
            Facultad de Ingeniería Informática
          </h1>
          <p className="text-xs text-gray-700 mt-0.5">
            Elección del Secretariado de la <span className="text-feu-carmesi-500 font-bold">FEU</span> · 2026
          </p>
        </div>

        {errorMessage && (
          <div
            id="login-error"
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 border border-red-200 flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" strokeWidth={2} aria-hidden />
            <span className="leading-snug font-medium">{errorMessage}</span>
          </div>
        )}
        {successMessage && !errorMessage && (
          <div
            role="status"
            className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 border border-emerald-200 flex items-start gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" strokeWidth={2} aria-hidden />
            <span className="leading-snug font-medium">{successMessage}</span>
          </div>
        )}

        {step === "ACTIVATE" ? (
          <form onSubmit={handleActivate} className="mt-3.5 space-y-3" noValidate>
            <p className="text-sm text-gray-700 leading-snug">
              Active su cuenta una sola vez antes de que abra la votación. Elija una contraseña que solo usted conozca.
            </p>
            <div className="space-y-1">
              <Label htmlFor="activation-ci">Carnet de identidad</Label>
              <Input
                id="activation-ci"
                inputMode="numeric"
                maxLength={11}
                value={activationCi}
                onChange={(e) => setActivationCi(e.target.value.replace(/\D/g, ""))}
                autoComplete="username"
                aria-describedby={errorId}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="activation-password">Nueva contraseña</Label>
              <Input
                id="activation-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                aria-describedby={["activation-password-hint", errorId].filter(Boolean).join(" ")}
              />
              <p id="activation-password-hint" className="text-xs text-gray-600">
                Mínimo 8 caracteres, con letras y números. No use su carnet.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="activation-confirm">Repita la contraseña</Label>
              <Input
                id="activation-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                aria-describedby={errorId}
              />
            </div>
            <SubmitButton loading={loading} label="Activar cuenta" />
            <Button variant="ghost" className="w-full underline" onClick={() => goTo("LOGIN")}>
              Ya tengo una cuenta activa: iniciar sesión
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="mt-3.5 space-y-3" noValidate>
            {step === "LOGIN" ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="login-identifier">Carnet de identidad o nombre completo</Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    aria-describedby={errorId}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    aria-describedby={errorId}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
                <p className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-amber-800" strokeWidth={2} aria-hidden />
                  <span>Verificación en dos pasos</span>
                </p>
                <Label htmlFor="login-totp" className="text-sm font-normal text-amber-900 leading-snug">
                  Escriba el código de 6 dígitos que muestra su aplicación de verificación.
                </Label>
                <Input
                  id="login-totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  aria-describedby={errorId}
                  className="text-center text-lg font-mono font-bold tracking-[0.3em] border-amber-300"
                />
                {devTotp && (
                  <p className="text-xs text-amber-900">
                    Desarrollo local · código de prueba: <span className="font-mono font-bold">{devTotp}</span>
                  </p>
                )}
                <Button
                  variant="ghost"
                  className="underline text-amber-900"
                  onClick={() => {
                    setTotpToken("");
                    goTo("LOGIN");
                  }}
                >
                  Cambiar de usuario
                </Button>
              </div>
            )}

            <SubmitButton loading={loading} label={step === "TOTP" ? "Verificar y entrar" : "Iniciar sesión"} />

            {step === "LOGIN" && (
              <Button
                variant="ghost"
                className="w-full underline text-cujae-green-700"
                onClick={() => {
                  setSuccessMessage(null);
                  goTo("ACTIVATE");
                }}
              >
                Primera vez: activar mi cuenta
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <Button type="submit" disabled={loading} className="w-full rounded-xl shadow-md" aria-busy={loading}>
      {loading ? (
        <>
          <span
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent"
            aria-hidden
          />
          <span>Verificando...</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </>
      )}
    </Button>
  );
}
