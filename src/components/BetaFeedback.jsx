// src/components/BetaFeedback.jsx
// Sprint 9 — NPS e feedback rápido para o beta fechado.
// Aparece após o 3º jogo disputado, uma única vez.

import React, { useState, useEffect } from 'react';
import { Star, X, Send, MessageSquare } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth }  from '../contexts/AuthContext';
import toast        from 'react-hot-toast';

const SHOWN_KEY = 'draft_play_beta_nps_shown';

export const shouldShowBetaFeedback = (gamesPlayed = 0) => {
  try {
    if (localStorage.getItem(SHOWN_KEY)) return false;
    return gamesPlayed >= 3;
  } catch { return false; }
};

const BetaFeedback = ({ onClose }) => {
  const { user }       = useAuth();
  const [step,  setStep]  = useState('nps');   // 'nps' | 'comment' | 'done'
  const [score, setScore] = useState(null);
  const [text,  setText]  = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(SHOWN_KEY, '1'); } catch {}
  }, []);

  const handleNPS = (n) => {
    setScore(n);
    setStep('comment');
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await supabase.from('beta_feedback').insert({
        user_id:    user?.id ?? null,
        nps_score:  score,
        comment:    text.trim() || null,
        created_at: new Date().toISOString(),
      });
    } catch {}
    toast.success('Obrigado pelo feedback! 🙏');
    setStep('done');
    setTimeout(() => onClose?.(), 1500);
    setSaving(false);
  };

  const npsColor = (n) => {
    if (n >= 9) return 'bg-green-500 text-white border-green-500';
    if (n >= 7) return 'bg-yellow-500 text-black border-yellow-500';
    return 'bg-red-500/20 text-red-400 border-red-500/40';
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-cyan-electric/20 rounded-t-[2.5rem] p-6 space-y-5 shadow-2xl animate-slide-up">

        {/* Fechar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-cyan-electric" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-low">
              Beta — Seu Feedback
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-text-muted hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Step NPS */}
        {step === 'nps' && (
          <>
            <div className="text-center">
              <p className="text-base font-black uppercase italic text-white">
                Você indicaria o Draft Play?
              </p>
              <p className="text-[11px] text-text-low mt-1">
                0 = Jamais · 10 = Com certeza!
              </p>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => handleNPS(n)}
                  className={`py-3 rounded-xl border text-sm font-black transition-all active:scale-90 ${
                    score === n ? npsColor(n) : 'bg-surface-2 border-border-mid text-text-low hover:border-border-strong'
                  } ${n === 10 ? 'col-span-2' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step comentário */}
        {step === 'comment' && (
          <>
            <div className="text-center">
              <p className="text-base font-black uppercase italic text-white">
                {score >= 9 ? 'Que ótimo! 🎉' : score >= 7 ? 'Bom saber!' : 'Nos ajude a melhorar!'}
              </p>
              <p className="text-[11px] text-text-low mt-1">
                O que podemos melhorar? (opcional)
              </p>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Ex: Faltou a funcionalidade X, o botão Y travou..."
              rows={3}
              maxLength={500}
              className="w-full bg-surface-2 border border-border-mid rounded-2xl px-4 py-3 text-[12px] text-white placeholder:text-text-muted resize-none focus:outline-none focus:border-cyan-electric/50"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit()}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={13} />
                {saving ? 'Enviando...' : 'Enviar'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 rounded-2xl bg-surface-2 border border-border-mid text-text-low font-black uppercase text-[10px] hover:text-white transition-colors"
              >
                Pular
              </button>
            </div>
          </>
        )}

        {/* Step done */}
        {step === 'done' && (
          <div className="text-center py-4">
            <p className="text-3xl mb-2">🙏</p>
            <p className="text-sm font-black uppercase text-white">Muito obrigado!</p>
            <p className="text-[11px] text-text-low mt-1">Seu feedback faz o Draft Play melhor.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BetaFeedback;
