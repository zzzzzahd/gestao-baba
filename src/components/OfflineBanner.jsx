// src/components/OfflineBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Banner de indicação de modo offline. Fase 4, Tarefa 4.6.
// Aparece no topo quando a conexão cai e desaparece automaticamente
// quando a conexão é restaurada.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineBanner = () => {
  const [status, setStatus] = useState('online'); // 'online' | 'offline' | 'restored'

  useEffect(() => {
    const handleOffline = () => setStatus('offline');
    const handleOnline  = () => {
      setStatus('restored');
      // Volta ao estado neutro após 3s
      setTimeout(() => setStatus('online'), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    // Verificar estado inicial
    if (!navigator.onLine) setStatus('offline');

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, []);

  if (status === 'online') return null;

  const isOffline   = status === 'offline';
  const isRestored  = status === 'restored';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
        isOffline
          ? 'bg-red-500/90 text-white backdrop-blur-md'
          : 'bg-green-500/90 text-black backdrop-blur-md'
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff size={13} className="shrink-0" />
          <span>Sem conexão — algumas funções podem não estar disponíveis</span>
        </>
      ) : (
        <>
          <Wifi size={13} className="shrink-0" />
          <span>Conexão restaurada</span>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
