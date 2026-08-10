// src/components/DailyRecapPanel.jsx
// Resumo do dia do baba: estatísticas fixas (líder, invicto, goleada) + texto
// narrado pelo Gemini em cima desses mesmos dados. Um resumo por dia.

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, Trophy, Shield, Flame } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const StatChip = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-2 border border-border-mid">
    <Icon size={13} className={color} />
    <div className="min-w-0">
      <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">{label}</p>
      <p className="text-[11px] font-black uppercase truncate">{value}</p>
    </div>
  </div>
);

export default function DailyRecapPanel({ babaId, isPresident }) {
  const [recap,       setRecap]       = useState(null); // { content, metadata, generated_at }
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState(null);

  const load = useCallback(async () => {
    if (!babaId) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabase.rpc('get_daily_recap', { p_baba_id: babaId });
      if (err) throw err;
      setRecap(data?.[0] || null);
    } catch (err) {
      console.error('[DailyRecapPanel] load:', err);
    } finally {
      setLoading(false);
    }
  }, [babaId]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const toastId = toast.loading('Resumindo o dia com Gemini AI...', { icon: '🤖' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data: result, error: fnError } = await supabase.functions.invoke(
        'generate-daily-recap',
        { body: { baba_id: babaId } },
      );
      if (fnError) {
        // fnError.context é a Response bruta do fetch — precisa ler o corpo JSON
        // pra pegar a mensagem amigável que a edge function retorna em { error }
        let serverMsg = null;
        try {
          const body = await fnError.context?.json();
          serverMsg = body?.error;
        } catch { /* corpo não era JSON, segue com a mensagem genérica */ }
        throw new Error(serverMsg || fnError.message || 'Erro ao gerar resumo');
      }
      if (result?.error) throw new Error(result.error);

      toast.success('Resumo do dia pronto! 🎯', { id: toastId });
      await load();
    } catch (err) {
      console.error('[DailyRecapPanel] generate:', err);
      setError(err.message || 'Erro ao gerar resumo');
      toast.error(err.message || 'Erro ao gerar resumo', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="h-24 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />;
  }

  const stats = recap?.metadata;

  return (
    <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-cyan-electric" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-low">Resumo do dia</span>
        </div>
        {isPresident && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[9px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all disabled:opacity-50"
          >
            {generating
              ? <RefreshCw size={10} className="animate-spin" />
              : <RefreshCw size={10} />
            }
            {recap ? 'Atualizar' : 'Gerar'}
          </button>
        )}
      </div>

      {error && <p className="text-[9px] font-black text-red-400">{error}</p>}

      {!recap ? (
        <p className="text-[10px] text-text-muted font-bold">
          {isPresident
            ? 'Ainda não tem resumo de hoje — toque em "Gerar" depois que algumas partidas terminarem.'
            : 'Ainda não tem resumo de hoje. O presidente pode gerar quando quiser.'}
        </p>
      ) : (
        <>
          <p className="text-xs font-bold text-white leading-relaxed">{recap.content}</p>

          {stats && (
            <div className="grid grid-cols-2 gap-2">
              {stats.topTeam && (
                <StatChip icon={Trophy} label="Líder do dia" value={`${stats.topTeam.name} · ${stats.topTeam.Pts} pts`} color="text-yellow-500" />
              )}
              {stats.unbeatenTeams?.length > 0 && (
                <StatChip icon={Shield} label="Invicto" value={stats.unbeatenTeams.join(', ')} color="text-green-400" />
              )}
              {stats.biggestWin && (
                <StatChip icon={Flame} label="Maior goleada" value={`${stats.biggestWin.winner} ${stats.biggestWin.score}`} color="text-orange-400" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
