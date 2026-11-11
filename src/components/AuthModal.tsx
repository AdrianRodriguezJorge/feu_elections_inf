"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertCircle, Check, ShieldCheck, ArrowRight } from "lucide-react";

export interface AuthUser {
  ci: string;
  name?: string;
  role: "ADMIN" | "COMMISSION" | "VOTER" | "OBSERVER";
  email?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  // Formulario Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [requireTotp, setRequireTotp] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ ci: string; name: string; role: string } | null>(null);

  // Estado y errores
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auxiliar de código TOTP en vivo para soporte institucional y pruebas
  const [liveTotp, setLiveTotp] = useState<{ token: string; secondsRemaining: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Obtener token TOTP actual para roles administrativos
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
  }, [isOpen]);

  // Limpiar estado al cerrar o abrir
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMessage("Por favor ingrese su nombre registrado o carnet de identidad.");
      return;
    }
    if (!cleanPassword) {
      setErrorMessage("Por favor ingrese su contraseña (número de Carnet de Identidad).");
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
          setErrorMessage(data.error || "Error al iniciar sesión.");
        }
        setLoading(false);
        return;
      }

      setSuccessMessage("¡Autenticación exitosa! Accediendo...");
      onLoginSuccess(data.user);
      setTimeout(() => {
        onClose();
        setRequireTotp(false);
        setPendingUser(null);
        setPassword("");
        setTotpToken("");
      }, 400);
    } catch {
      setErrorMessage("Error de conexión con el servidor. Intente nuevamente.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-200">
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              Acceso al Sistema Electoral
            </h2>
            <p className="text-xs text-gray-500">
              Elección del Secretariado de la Facultad
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal de autenticación"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Nota informativa de credenciales provisionales */}
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-950 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" strokeWidth={2} />
          <div className="text-[11px] leading-relaxed">
            <strong>Credenciales del Elector:</strong> Acceda ingresando su{" "}
            <strong>Nombre</strong> tal como figura en el Listado de Electores y su{" "}
            <strong>Carnet de Identidad</strong> (11 dígitos) como contraseña.
          </div>
        </div>

        {/* Mensajes de Alerta y Estado */}
        {errorMessage && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" strokeWidth={2} />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-start gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2} />
            <span className="leading-snug">{successMessage}</span>
          </div>
        )}

        {/* Formulario de Inicio de Sesión */}
        <form onSubmit={handleLogin} className="mt-4 space-y-4">
          {!requireTotp ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. Adrián Rodríguez Jorge, Adán Adán Cabrera..."
                    autoComplete="username"
                    required
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20 focus:outline-hidden transition"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Nombre completo o apellidos registrados en la Facultad.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Carnet de Identidad (11 dígitos)"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20 focus:outline-hidden font-mono transition"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Su contraseña provisional corresponde a su número de CI.
                </p>
              </div>
            </>
          ) : (
            /* Pantalla de Verificación de Segundo Factor TOTP */
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-800" strokeWidth={2} />
                  <span>Segundo Factor Requerido (MFA TOTP)</span>
                </span>
                {pendingUser && (
                  <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                    {pendingUser.role}
                  </span>
                )}
              </div>

              <p className="text-xs text-amber-900 leading-relaxed">
                El usuario <strong className="font-semibold">{pendingUser?.name}</strong> tiene
                responsabilidades oficiales. Ingrese el código de 6 dígitos generado por su
                aplicación autenticadora (Google Authenticator o FreeOTP).
              </p>

              {liveTotp && (
                <div className="flex items-center justify-between rounded-lg bg-amber-100/80 px-3 py-2 border border-amber-200/80">
                  <span className="text-[11px] font-medium text-amber-900">
                    Código activo ({liveTotp.secondsRemaining}s):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-widest text-amber-950">
                      {liveTotp.token}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTotpToken(liveTotp.token)}
                      className="rounded bg-amber-700 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-800 transition"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-center text-xl font-mono font-bold tracking-[0.3em] text-amber-950 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetTotp}
                  className="text-xs text-amber-800 hover:text-amber-950 underline"
                >
                  ← Cambiar de usuario
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#136D54] py-3 text-sm font-bold text-white shadow-md hover:bg-[#0f5441] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                <span>Verificando credenciales...</span>
              </>
            ) : requireTotp ? (
              <span className="inline-flex items-center gap-1.5">
                <span>Confirmar Código y Entrar</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span>Iniciar Sesión</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </span>
            )}
          </button>
        </form>

        {/* Footer institucional */}
        <div className="mt-5 border-t border-gray-100 pt-3 text-center">
          <p className="text-[11px] text-gray-400">
            Comisión Electoral · Facultad de Ingeniería Informática · CUJAE
          </p>
        </div>
      </div>
    </div>
  );
}
