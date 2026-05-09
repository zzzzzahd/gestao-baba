// src/components/ConsentModal.jsx
// Sprint 10.5 — Modal de consentimento LGPD. Exibido no primeiro login.

import React, { useState } from 'react';
import { Shield, FileText, ExternalLink, Check } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ConsentModal({ onAccepted }) {
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleAccept = async () => {
    if (!checked) { toast.error('Marque a caixa para continuar'); return; }
    setLoading(true);
    try {
      // Registrar consentimento via RPC
      await supabase.rpc('record_consent', {
        p_type:    'terms',
        p_version: '1.0',
        p_granted: true,
        p_ua:      navigator.userAgent.substring(0, 200),
      });
      await supabase.rpc('record_consent', {
        p_type:    'privacy',
        p_version: '1.0',
        p_granted: true,
        p_ua:      navigator.userAgent.substring(0, 200),
      });
      toast.success('Bem-vindo ao Draft Play! 🎉');
      onAccepted?.();
    } catch (err) {
      console.error('[ConsentModal]', err);
      toast.error('Erro ao registrar consentimento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-surface-1 border border-border-mid rounded-3xl p-6 space-y-5 shadow-2xl">

        {/* Ícone + título */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center">
            <Shield size={24} className="text-cyan-electric" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">
              Antes de continuar
            </h2>
            <p className="text-[10px] text-text-low mt-1 leading-relaxed">
              De acordo com a LGPD, precisamos do seu consentimento para usar o Draft Play.
            </p>
          </div>
        </div>

        {/* Lista de o que coletamos */}
        <div className="space-y-2.5 px-2">
          {[
            { icon: '📧', text: 'E-mail e nome para identificação' },
            { icon: '📊', text: 'Estatísticas de jogo (gols, partidas, avaliações)' },
            { icon: '🔔', text: 'Tokens de notificação push (opcional)' },
            { icon: '📍', text: 'Nenhum dado de localização é coletado' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">{item.icon}</span>
              <p className="text-[10px] text-text-mid font-black leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Links para documentos */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/privacidade')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border-mid text-[9px] font-black uppercase text-text-low hover:text-white hover:border-border-high transition-all"
          >
            <FileText size={11} />
            Política de Privacidade
          </button>
          <button
            onClick={() => window.open('/termos', '_blank')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border-mid text-[9px] font-black uppercase text-text-low hover:text-white hover:border-border-high transition-all"
          >
            <ExternalLink size={11} />
            Termos de Uso
          </button>
        </div>

        {/* Checkbox + botão */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <button
              onClick={() => setChecked(v => !v)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                checked
                  ? 'bg-cyan-electric border-cyan-electric'
                  : 'border-border-high bg-surface-2'
              }`}
            >
              {checked && <Check size={11} className="text-black" strokeWidth={3} />}
            </button>
            <p className="text-[10px] text-text-mid leading-relaxed font-black">
              Li e concordo com os Termos de Uso e a Política de Privacidade. Estou ciente sobre o tratamento dos meus dados pessoais.
            </p>
          </label>

          <button
            onClick={handleAccept}
            disabled={!checked || loading}
            className="w-full py-3.5 rounded-2xl bg-cyan-electric text-black text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <Check size={14} />}
            {loading ? 'Registrando...' : 'Aceitar e continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
