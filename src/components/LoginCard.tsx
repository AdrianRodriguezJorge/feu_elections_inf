"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, ShieldCheck, ArrowRight } from "lucide-react";
import { AuthUser } from "./AuthModal";

interface LoginCardProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export function LoginCard({ onLoginSuccess }: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [requireTotp, setRequireTotp] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ ci: string; name: string; role: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auxiliar TOTP en vivo para soporte institucional
  const [liveTotp, setLiveTotp] = useState<{ token: string; secondsRemaining: number } | null>(null);

  useEffect(() => {
    const fetchTotp = async () => {
      try {
        const res = await fetch("/api/auth/totp/current");
        const data = await res.json();
        if (data.ok) {
          setLiveTotp({ token: data.token, secondsRemaining: data.secondsRemaining });
        }
      } catch {
        // Silencioso
      }
    };

    fetchTotp();
    const interval = setInterval(fetchTotp, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMessage("Por favor ingrese su nombre registrado.");
      return;
    }
    if (!cleanPassword) {
      setErrorMessage("Por favor ingrese su contraseña (Carnet de Identidad).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
          totpToken: totpToken.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requireTotp) {
          setRequireTotp(true);
          setPendingUser(data.user);
          setErrorMessage("Se requiere el código de 6 dígitos del autenticador (MFA TOTP) para este rol oficial.");
        } else {
          setErrorMessage(data.error || "Credenciales incorrectas.");
        }
        setLoading(false);
        return;
      }

      onLoginSuccess(data.user);
    } catch {
      setErrorMessage("Error de conexión con el servidor electoral.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetTotp = () => {
    setRequireTotp(false);
    setPendingUser(null);
    setTotpToken("");
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-[380px] sm:max-w-[400px]">
      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xl">
        {/* Cabecera Institucional con los 3 Logos Oficiales */}
        <div className="text-center pb-3 border-b border-gray-100">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src="/logos/cujae_rgba.png"
                alt="CUJAE"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src="/logos/feu_512.png"
                alt="FEU"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src="/logos/informatica_512.png"
                alt="Facultad de Ingeniería Informática"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
            Facultad de Ingeniería Informática
          </h1>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
            Elección del Secretariado de la <span className="text-[#8F1639] font-bold">FEU</span> · 2026
          </p>
        </div>

        {/* Mensaje de Error Compacto */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-2.5 rounded-lg bg-red-50/95 px-2.5 py-1.5 text-xs text-red-800 border border-red-200 flex items-center gap-2 animate-in fade-in duration-150"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" strokeWidth={2} />
            <span className="leading-tight text-[11px] sm:text-xs font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Formulario Estricto */}
        <form onSubmit={handleLogin} className="mt-3.5 space-y-3">
          {!requireTotp ? (
            <>
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Nombre completo registrado"
                  autoComplete="username"
                  required
                  className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden transition ${
                    errorMessage
                      ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200"
                      : "border-gray-300 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Carnet de Identidad (11 dígitos)"
                  autoComplete="current-password"
                  required
                  className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden font-mono transition ${
                    errorMessage
                      ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200"
                      : "border-gray-300 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20"
                  }`}
                />
              </div>
            </>
          ) : (
            /* Pantalla de Verificación TOTP (Roles Oficiales) */
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-1">
                <span className="text-[11px] sm:text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-800" strokeWidth={2} />
                  <span>MFA TOTP Oficial</span>
                </span>
                {pendingUser && (
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 uppercase">
                    {pendingUser.role}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-amber-900 leading-tight">
                Usuario oficial: <strong className="font-semibold">{pendingUser?.name}</strong>. Ingrese su código de 6 dígitos.
              </p>

              {liveTotp && (
                <div className="flex items-center justify-between rounded-lg bg-amber-100/80 px-2 py-1 border border-amber-200/80">
                  <span className="text-[10px] sm:text-[11px] font-medium text-amber-900">
                    Código ({liveTotp.secondsRemaining}s):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold tracking-widest text-amber-950">
                      {liveTotp.token}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTotpToken(liveTotp.token)}
                      className="rounded bg-amber-700 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-amber-800 transition cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-center text-lg font-mono font-bold tracking-[0.3em] text-amber-950 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleResetTotp}
                  className="text-[10px] text-amber-800 hover:text-amber-950 underline cursor-pointer"
                >
                  ← Cambiar de usuario
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#136D54] py-2 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#0f5441] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {loading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                <span>Verificando...</span>
              </>
            ) : requireTotp ? (
              <>
                <span>Confirmar y Entrar</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
