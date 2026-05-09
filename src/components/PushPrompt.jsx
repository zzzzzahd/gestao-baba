// src/components/PushPrompt.jsx
// Sprint 9 — Prompt de permissão de push. Usa RPCs upsert/deactivate + get_push_status.

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Zap } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

const DISMISSED_KEY = 'push_prompt_dismissed_at';
const DISMISS_DAYS  = 7;

function wasDismissedRecently() {
  const ts = localStorage.getItem(DISMISSED_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < DISMISS_DAYS * 86400000;
}

export default function PushPrompt() {
  const { permission, subscribed, loading, supported, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!supported) return;
    if (permission === 'granted') return;
    if (permission === 'denied') return;
    if (subscribed) return;
    if (wasDismissedRecently()) return;

    const id = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(id);
  }, [supported, permission, subscribed]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    const ok = await subscribe();
    setSubscribing(false);
    if (ok) setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible || loading) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
      <div className="max-w-sm mx-auto bg-surface-1 border border-cyan-electric/30 rounded-2xl p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-md">

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-text-low hover:text-white transition-colors"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* Ícone */}
          <div className="w-10 h-10 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-cyan-electric" />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-white mb-0.5">
              Ativar notificações
            </p>
            <p className="text-[10px] text-text-low leading-relaxed">
              Receba lembretes do jogo, promoções da fila e resultados do sorteio.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-border-mid text-text-low hover:text-white hover:border-border-high transition-all"
          >
            Agora não
          </button>
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-cyan-electric text-black hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {subscribing ? (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap size={12} />
            )}
            {subscribing ? 'Ativando...' : 'Ativar'}
          </button>
        </div>
      </div>
    </div>
  );
}
