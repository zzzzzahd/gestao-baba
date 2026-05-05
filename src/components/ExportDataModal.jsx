// src/components/ExportDataModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal de exportação de dados pessoais — direito LGPD. Sprint 10.5 Fase C.
// Gera um JSON com todos os dados do usuário e oferece download.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { X, Download, RefreshCw, Shield } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ExportDataModal = ({ onClose }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Buscar todos os dados do usuário
      const [
        { data: profileData },
        { data: playersData },
        { data: confirmationsData },
        { data: ratingsData },
        { data: paymentsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('players').select('*, babas(name)').eq('user_id', user.id),
        supabase.from('game_confirmations').select('*, babas(name)').in(
          'player_id',
          (await supabase.from('players').select('id').eq('user_id', user.id)).data?.map(p => p.id) || []
        ),
        supabase.from('player_ratings').select('*').in(
          'rated_player_id',
          (await supabase.from('players').select('id').eq('user_id', user.id)).data?.map(p => p.id) || []
        ),
        supabase.from('payments').select('*, financials(description, amount)').eq('user_id', user.id),
      ]);

      // Remover campos sensíveis internos
      const exportData = {
        exportedAt:    new Date().toISOString(),
        exportVersion: '1.0',
        legalBasis:    'LGPD Art. 18, III — Direito de acesso aos dados',
        profile: {
          id:         profileData?.id,
          name:       profileData?.name,
          email:      profileData?.email,
          position:   profileData?.position,
          created_at: profileData?.created_at,
          consent_at: profileData?.consent_at,
        },
        grupos:        (playersData || []).map(p => ({
          baba:      p.babas?.name,
          position:  p.position,
          joinedAt:  p.created_at,
          suspended: p.is_suspended,
        })),
        presencas:     (confirmationsData || []).map(c => ({
          baba:      c.babas?.name,
          date:      c.game_date,
          status:    c.status,
        })),
        avaliacoes_recebidas: (ratingsData || []).map(r => ({
          baba:       r.baba_id,
          skill:      r.skill,
          physical:   r.physical,
          commitment: r.commitment,
          createdAt:  r.created_at,
        })),
        pagamentos:    (paymentsData || []).map(p => ({
          descricao:  p.financials?.description,
          valor:      p.financials?.amount,
          status:     p.status,
          data:       p.created_at,
        })),
      };

      // Download como JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `draft-play-dados-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Dados exportados com sucesso!');
      onClose();
    } catch (err) {
      console.error('[ExportData]', err);
      toast.error('Erro ao exportar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-5">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-border-mid rounded-[2rem] p-7 space-y-6">

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center">
              <Download size={18} className="text-cyan-electric" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">Exportar Dados</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase">LGPD Art. 18</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-low hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle space-y-2">
          <p className="text-[12px] text-text-mid leading-relaxed">
            Você receberá um arquivo <strong className="text-white">.json</strong> com todos os seus dados do Draft Play:
          </p>
          <ul className="text-[11px] text-text-low space-y-1 pl-3">
            {['Perfil e configurações','Grupos que participa','Histórico de presenças','Avaliações recebidas','Histórico de pagamentos'].map(i => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 bg-cyan-electric rounded-full shrink-0" />
                {i}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface-2 border border-border-mid rounded-2xl text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest text-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            {loading ? <><RefreshCw size={12} className="animate-spin" /> Gerando...</> : <><Download size={12} /> Exportar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDataModal;
