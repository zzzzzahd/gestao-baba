// src/components/UpdatePrompt.jsx
// Banner "nova versão disponível" — sem isso, um PWA instalado podia ficar
// rodando código antigo por dias, já que ninguém força um reload quando o
// Service Worker baixa uma versão nova (evento pwa-update-available, disparado
// no main.jsx).

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const UpdatePrompt = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  const handleUpdate = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] max-w-sm mx-auto bg-surface-1 border border-cyan-electric/30 rounded-2xl p-4 flex items-center gap-3 shadow-2xl shadow-cyan-500/10 animate-slide-up">
      <RefreshCw size={18} className="text-cyan-electric shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase tracking-widest text-white">
          Nova versão disponível
        </p>
        <p className="text-[10px] text-text-low">Toque para atualizar o app</p>
      </div>
      <button
        onClick={handleUpdate}
        className="px-3 py-2 rounded-xl font-black text-black text-[10px] uppercase tracking-widest shrink-0 active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
      >
        Atualizar
      </button>
    </div>
  );
};

export default UpdatePrompt;
