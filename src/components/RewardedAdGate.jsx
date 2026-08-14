// src/components/RewardedAdGate.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal "assista a um anúncio para liberar" — usado no Modo Visitante antes de
// revelar o sorteio e antes de iniciar a partida.
//
// Uso:
//   const [showGate, setShowGate] = useState(false);
//
//   <RewardedAdGate
//     open={showGate}
//     placementName="liberar-sorteio"
//     title="Times sorteados!"
//     description="Assista a um anúncio curto pra ver o resultado."
//     onGranted={() => { setShowGate(false); /* segue o fluxo */ }}
//     onCancel={() => setShowGate(false)}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { PlayCircle, Loader2 } from 'lucide-react';
import { useRewardedAd } from '../hooks/useRewardedAd';

const RewardedAdGate = ({
  open,
  placementName,
  title = 'Quase lá!',
  description = 'Assista a um anúncio curto pra liberar.',
  onGranted,
  onCancel,
}) => {
  const { requestReward } = useRewardedAd(placementName);
  const [status, setStatus] = useState('idle'); // idle | loading | skipped

  if (!open) return null;

  const handleWatch = () => {
    setStatus('loading');
    requestReward(
      () => { setStatus('idle'); onGranted?.(); },
      () => { setStatus('skipped'); }
    );
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={status === 'loading' ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm bg-[#0a0a0a] border border-border-mid rounded-[2rem] p-7 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-cyan-electric/10 border border-cyan-electric/20">
          <PlayCircle size={24} className="text-cyan-electric" />
        </div>

        <p className="text-base font-black text-white text-center uppercase tracking-tight leading-snug">
          {title}
        </p>
        <p className="text-[11px] text-text-low text-center mt-2 leading-relaxed font-medium">
          {status === 'skipped'
            ? 'O anúncio não foi concluído. Tente assistir de novo pra liberar.'
            : description}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-7">
          <button
            onClick={onCancel}
            disabled={status === 'loading'}
            className="py-4 rounded-2xl bg-surface-2 border border-border-mid text-text-mid font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-all active:scale-95 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleWatch}
            disabled={status === 'loading'}
            className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all text-black flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            {status === 'loading'
              ? <Loader2 size={14} className="animate-spin" />
              : <PlayCircle size={14} />}
            {status === 'loading' ? 'Carregando' : 'Assistir'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardedAdGate;
