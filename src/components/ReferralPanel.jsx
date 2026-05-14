// src/components/ReferralPanel.jsx
// Programa de indicação: gera código único, exibe estatísticas e permite compartilhar.

import React, { useState, useEffect } from 'react';
import { Gift, Copy, Check, Share2, Users, Crown } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export default function ReferralPanel() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    supabase.rpc('get_or_create_referral_code').then(({ data: d, error }) => {
      if (!error && d) setData(d);
      setLoading(false);
    });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.url);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    const text = `⚽ Entra no Draft Play e gerencia nosso baba de forma profissional!\nCria sua conta pelo meu link e ganhe benefícios:\n${data.url}`;
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) return (
    <div className="animate-pulse space-y-3">
      <div className="h-24 bg-surface-2 rounded-3xl" aria-hidden="true" />
      <div className="h-12 bg-surface-2 rounded-2xl" aria-hidden="true" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center">
          <Gift size={14} className="text-cyan-electric" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-white">Indique amigos</p>
          <p className="text-[9px] text-text-low">Cada amigo que entrar = 30 dias Pro para você</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-1 border border-border-subtle rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-cyan-electric">{data.uses ?? 0}</p>
          <p className="text-[8px] font-black uppercase text-text-low tracking-widest">Indicados</p>
        </div>
        <div className="bg-surface-1 border border-border-subtle rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Crown size={14} className="text-yellow-400" aria-hidden="true" />
            <p className="text-2xl font-black text-yellow-400">{(data.uses ?? 0) * 30}</p>
          </div>
          <p className="text-[8px] font-black uppercase text-text-low tracking-widest">Dias Pro</p>
        </div>
      </div>

      {/* Link */}
      <div className="bg-surface-2 border border-border-mid rounded-2xl p-3">
        <p className="text-[8px] font-black uppercase text-text-low mb-1.5 tracking-widest">Seu link de indicação</p>
        <p className="text-[11px] text-text-mid font-mono break-all mb-3">{data.url}</p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            aria-label="Copiar link de indicação"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
              copied
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-surface-2 border-border-mid text-text-low hover:text-white'
            }`}
          >
            {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={handleShare}
            aria-label="Compartilhar link de indicação via WhatsApp"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Share2 size={12} aria-hidden="true" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Como funciona */}
      <div className="text-[10px] text-text-low space-y-1.5">
        <p className="font-black uppercase tracking-widest text-text-mid">Como funciona</p>
        <p>1. Compartilhe seu link com amigos</p>
        <p>2. Eles criam conta pelo seu link</p>
        <p>3. Você ganha 30 dias de plano Pro por indicação</p>
      </div>
    </div>
  );
}
