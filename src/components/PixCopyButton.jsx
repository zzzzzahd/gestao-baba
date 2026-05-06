import { useState, useEffect } from "react";
import QRCode from "qrcode";

/**
 * Gera a string EMV/PIX estático (copia-e-cola) a partir de uma chave Pix.
 * Suporta: CPF, CNPJ, e-mail, telefone e chave aleatória.
 */
function buildPixEMV(pixKey, merchantName = "Gestao Baba", merchantCity = "Brasil", amount = 0) {
  function pad(id, value) {
    const v = String(value);
    return `${id}${String(v.length).padStart(2, "0")}${v}`;
  }

  const gui = pad("00", "BR.GOV.BCB.PIX") + pad("01", pixKey);
  const merchantAccountInfo = pad("26", gui);

  const transactionAmount = amount > 0 ? pad("54", amount.toFixed(2)) : "";

  const additionalData = pad("05", "***");
  const additionalDataField = pad("62", additionalData);

  let emv =
    pad("00", "01") +
    pad("01", "12") + // sem pagamento único, reutilizável
    merchantAccountInfo +
    pad("52", "0000") + // MCC genérico
    pad("53", "986") +  // BRL
    transactionAmount +
    pad("58", "BR") +
    pad("59", merchantName.substring(0, 25)) +
    pad("60", merchantCity.substring(0, 15)) +
    additionalDataField +
    "6304"; // placeholder CRC

  // CRC-16/CCITT-FALSE
  function crc16(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      }
    }
    return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  }

  return emv + crc16(emv);
}

export default function PixCopyButton({ pixKey, babaName = "Gestao Baba", city = "Brasil" }) {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [emv, setEmv] = useState("");

  useEffect(() => {
    if (!pixKey) return;
    const code = buildPixEMV(pixKey, babaName, city);
    setEmv(code);
    QRCode.toDataURL(code, { width: 200, margin: 1, color: { dark: "#06b6d4", light: "#0f172a" } })
      .then(setQrUrl)
      .catch(console.error);
  }, [pixKey, babaName, city]);

  const handleCopy = async () => {
    if (!emv) return;
    try {
      await navigator.clipboard.writeText(emv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = emv;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!pixKey) {
    return (
      <p className="text-sm text-gray-400 italic">
        Nenhuma chave Pix cadastrada para este baba.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      {qrUrl && (
        <div className="rounded-xl overflow-hidden border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <img src={qrUrl} alt="QR Code Pix" className="w-48 h-48" />
        </div>
      )}

      {/* Chave mascarada */}
      <p className="text-xs text-gray-400 font-mono break-all max-w-xs text-center">
        Chave: <span className="text-cyan-400">{pixKey}</span>
      </p>

      {/* Botão copiar */}
      <button
        onClick={handleCopy}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-sm
          transition-all duration-200
          ${copied
            ? "bg-green-500/20 border border-green-500 text-green-400"
            : "bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 active:scale-95"
          }
        `}
      >
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copiado!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar chave Pix
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center max-w-xs">
        Cole no seu app de banco para pagar via Pix instantâneo.
      </p>
    </div>
  );
}
