"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { ReceiptVerifierModal } from "./ReceiptVerifierModal";

interface PublicReceiptVerifierProps {
  onBackToLogin?: () => void;
}

export function PublicReceiptVerifier({ onBackToLogin }: PublicReceiptVerifierProps) {
  const [inputHash, setInputHash] = useState("");
  const [activeHash, setActiveHash] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputHash.trim()) {
      setActiveHash(inputHash.trim());
    }
  };

  return (
    <div className="mx-auto max-w-xl w-full">
      <div className="rounded-2xl border border-gray-200 bg-white p-7 sm:p-8 shadow-xl">
        <div className="text-center pb-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Verificación de Boletas en la Urna
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Auditoría criptográfica del sufragio sin vincular la identidad del elector
          </p>
        </div>

        <p className="mt-4 text-xs text-gray-600 leading-relaxed text-center">
          Si ya has ejercido tu derecho al voto en este proceso electoral y conservas el código
          SHA-256 de tu comprobante, ingrésalo a continuación para verificar que tu boleta se
          encuentra íntegra en la urna electrónica inmutable.
        </p>

        <form onSubmit={handleSearch} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Código de Comprobante Oficial (SHA-256)
            </label>
            <input
              type="text"
              value={inputHash}
              onChange={(e) => setInputHash(e.target.value)}
              placeholder="Ej. e481e2161500f1c8d159cc180ab6f72d98c8e24f88..."
              className="w-full rounded-xl border border-gray-300 p-3 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-[#136D54] focus:ring-2 focus:ring-[#136D54]/20 focus:outline-hidden"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#136D54] py-3 text-sm font-bold text-white shadow-md hover:bg-[#0f5441] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="h-4 w-4" strokeWidth={2} />
            <span>Localizar Boleta en la Urna</span>
          </button>
        </form>

        {onBackToLogin && (
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs text-gray-500 hover:text-gray-900 underline cursor-pointer"
            >
              ← Volver al portal de acceso
            </button>
          </div>
        )}
      </div>

      {activeHash && (
        <ReceiptVerifierModal
          receiptHash={activeHash}
          onClose={() => setActiveHash(null)}
        />
      )}
    </div>
  );
}

