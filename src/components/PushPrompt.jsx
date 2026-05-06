// src/components/PushPrompt.jsx
// Sprint 9.1a — Banner discreto solicitando permissão de notificação push.
// Exibido uma vez após login, some se o usuário aceitar ou dispensar.

import React, { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'push_prompt_dismissed';

export default function PushPrompt() {
  const { supported, permission, subscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );

  // Não exibe se: não suportado, já concedido/negado, já subscrito, ou dispensado
  if (!supported || permission !== 'default' || subscribed || dismissed) return null;

  const handleAccept = async () => {
    const ok = await subscribe();
    if (ok) {
      toast.success('Notificações ativadas! 🔔');
      setDismissed(true);
      localStorage.setItem(STORAGE_KEY, '1');
    } else {
      toast.error('Não foi possível ativar notificações.');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-[#0d0d0d] border border-cyan-electric/30 rounded-2xl p-4 shadow-2xl shadow-cyan-electric/10 flex items-start gap-3">
        <div className="p-2 bg-cyan-electric/10 rounded-xl shrink-0">
          <Bell size={18} className="text-cyan-electric" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-white mb-0.5">
            Ativar notificações
          </p>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Receba lembrete do baba, confirmação de presença e aviso de sorteio.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 py-2 bg-cyan-electric text-black rounded-xl font-black uppercase text-[9px] tracking-widest disabled:opacity-50 active:scale-95 transition-all"
            >
              {loading ? 'Ativando...' : 'Ativar'}
            </button>
            <button
              onClick={handleDismiss}
              className="py-2 px-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
            >
              <BellOff size={14} />
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-600 hover:text-white transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
