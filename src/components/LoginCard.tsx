"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import type { LoginErrorCode } from "@/lib/session-user";

interface LoginCardProps {
  onLoginSuccess: () => void;
}

type Step = "LOGIN" | "TOTP" | "ACTIVATE";

const LOGIN_ERRORS: Record<LoginErrorCode, string> = {
  credentials: "Usuario o contraseña incorrectos.",
  totp_required: "Introduce el código de 6 dígitos de tu aplicación de verificación.",
  totp_invalid: "El código de verificación no es correcto o ya caducó. Prueba con el código actual.",
  mfa_not_configured:
    "Tu cuenta de autoridad no tiene configurado el segundo factor. Contacta al administrador del sistema.",
  not_activated: "Tu cuenta aún no está activada. Actívala con tu carnet de identidad para elegir tu contraseña.",
  ambiguous_name: "Hay más de una persona con ese nombre. Entra con tu carnet de identidad.",
  rate_limited: "Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.",
};

const inputClass =
  "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20 focus:outline-hidden transition";

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim() || !password) {
      setErrorMessage("Escribe tu carnet o nombre completo y tu contraseña.");
      return;
    }
    if (step === "TOTP" && !/^\d{6}$/.test(totpToken)) {
      setErrorMessage("El código de verificación tiene 6 dígitos.");
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
      setErrorMessage("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!/^\d{11}$/.test(activationCi.trim())) {
      setErrorMessage("El carnet de identidad tiene 11 dígitos.");
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres, con letras y números.");
      return;
    }
    if (newPassword === activationCi.trim()) {
      setErrorMessage("La contraseña no puede ser tu carnet de identidad.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Las dos contraseñas no coinciden.");
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
        setErrorMessage(data.error || "No se pudo activar la cuenta.");
        return;
      }
      setIdentifier(activationCi.trim());
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage(data.message);
      goTo("LOGIN");
    } catch {
      setErrorMessage("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] sm:max-w-[400px]">
      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xl">
        {/* Cabecera institucional con los 3 logos oficiales */}
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
          <p className="text-xs text-gray-600 mt-0.5">
            Elección del Secretariado de la <span className="text-[#8F1639] font-bold">FEU</span> · 2026
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 border border-red-200 flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-px" strokeWidth={2} />
            <span className="leading-snug font-medium">{errorMessage}</span>
          </div>
        )}
        {successMessage && !errorMessage && (
          <div
            role="status"
            className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 border border-emerald-200 flex items-start gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-px" strokeWidth={2} />
            <span className="leading-snug font-medium">{successMessage}</span>
          </div>
        )}

        {step === "ACTIVATE" ? (
          <form onSubmit={handleActivate} className="mt-3.5 space-y-3" noValidate>
            <p className="text-xs text-gray-600 leading-snug">
              Activa tu cuenta una sola vez antes de que abra la votación. Elige una contraseña que solo tú conozcas.
            </p>
            <div>
              <label htmlFor="activation-ci" className="block text-xs font-semibold text-gray-700 mb-1">
                Carnet de identidad
              </label>
              <input
                id="activation-ci"
                inputMode="numeric"
                maxLength={11}
                value={activationCi}
                onChange={(e) => setActivationCi(e.target.value.replace(/\D/g, ""))}
                autoComplete="username"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="activation-password" className="block text-xs font-semibold text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                id="activation-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                aria-describedby="activation-password-hint"
                className={inputClass}
              />
              <p id="activation-password-hint" className="mt-1 text-xs text-gray-500">
                Mínimo 8 caracteres, con letras y números. No uses tu carnet.
              </p>
            </div>
            <div>
              <label htmlFor="activation-confirm" className="block text-xs font-semibold text-gray-700 mb-1">
                Repite la contraseña
              </label>
              <input
                id="activation-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <SubmitButton loading={loading} label="Activar cuenta" />
            <button
              type="button"
              onClick={() => goTo("LOGIN")}
              className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
            >
              Ya tengo cuenta: iniciar sesión
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="mt-3.5 space-y-3" noValidate>
            {step === "LOGIN" ? (
              <>
                <div>
                  <label htmlFor="login-identifier" className="block text-xs font-semibold text-gray-700 mb-1">
                    Carnet de identidad o nombre completo
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-xs font-semibold text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-amber-800" strokeWidth={2} />
                  <span>Verificación en dos pasos</span>
                </p>
                <label htmlFor="login-totp" className="block text-xs text-amber-900 leading-snug">
                  Escribe el código de 6 dígitos que muestra tu aplicación de verificación.
                </label>
                <input
                  id="login-totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-center text-lg font-mono font-bold tracking-[0.3em] text-amber-950 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20 focus:outline-hidden"
                />
                {devTotp && (
                  <p className="text-xs text-amber-900">
                    Desarrollo local · código de prueba: <span className="font-mono font-bold">{devTotp}</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTotpToken("");
                    goTo("LOGIN");
                  }}
                  className="text-xs text-amber-800 hover:text-amber-950 underline"
                >
                  Cambiar de usuario
                </button>
              </div>
            )}

            <SubmitButton loading={loading} label={step === "TOTP" ? "Verificar y entrar" : "Iniciar sesión"} />

            {step === "LOGIN" && (
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage(null);
                  goTo("ACTIVATE");
                }}
                className="w-full py-2 text-xs font-semibold text-[#136D54] hover:text-[#0C4B39] underline"
              >
                Primera vez: activar mi cuenta
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full min-h-11 rounded-xl bg-[#136D54] py-2 text-sm font-bold text-white shadow-md hover:bg-[#0C4B39] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
    >
      {loading ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
          <span>Verificando...</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
        </>
      )}
    </button>
  );
}
