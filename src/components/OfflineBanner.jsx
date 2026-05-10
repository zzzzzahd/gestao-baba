// src/components/OfflineBanner.jsx
// Sprint 20 — Exibe status de conexão + quantidade de ações pendentes na fila offline

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

const QUEUE_KEY = 'draft_play_offline_queue';

const getPendingCount = () => {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return q.length;
  } catch {
    return 0;
  }
};

const OfflineBanner = () => {
  const [status,       setStatus]       = useState('online'); // 'online' | 'offline' | 'restored'
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing,      setSyncing]      = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setStatus('offline');
      setPendingCount(getPendingCount());
    };

    const handleOnline = () => {
      setStatus('restored');
      setPendingCount(getPendingCount());
      setTimeout(() => setStatus('online'), 3500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    // Estado inicial
    if (!navigator.onLine) {
      setStatus('offline');
      setPendingCount(getPendingCount());
    }

    // Atualizar contagem da fila periodicamente quando offline
    const interval = setInterval(() => {
      if (!navigator.onLine) setPendingCount(getPendingCount());
    }, 2000);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
      clearInterval(interval);
    };
  }, []);

  if (status === 'online') return null;

  const isOffline  = status === 'offline';
  const isRestored = status === 'restored';

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
          <span>
            Sem conexão
            {pendingCount > 0 && ` · ${pendingCount} ação${pendingCount > 1 ? 'ões' : ''} pendente${pendingCount > 1 ? 's' : ''}`}
          </span>
        </>
      ) : (
        <>
          <Wifi size={13} className="shrink-0" />
          <span>
            Conexão restaurada
            {pendingCount > 0 && (
              <span className="ml-1 opacity-80">
                · sincronizando {pendingCount} ação{pendingCount > 1 ? 'ões' : ''}...
              </span>
            )}
          </span>
          {pendingCount > 0 && (
            <RefreshCw size={11} className="animate-spin shrink-0" />
          )}
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
