// src/components/AiInsightsPanel.jsx
// Sprint 18 — Exibe insights gerados pela IA (Claude Haiku) sobre o baba.
// Presidente pode acionar nova geração. Insights expiram em 24h.

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, RefreshCw, Sparkles, TrendingUp, Users, Calendar, Shuffle } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast        from 'react-hot-toast';

const TYPE_CONFIG = {
  player_form:       { icon: TrendingUp, color: 'text-cyan-electric',  bg: 'bg-cyan-electric/5  border-cyan-electric/15',  label: 'Forma'       },
  team_chemistry:    { icon: Users,      color: 'text-purple-400',     bg: 'bg-purple-400/5    border-purple-400/15',       label: 'Química'     },
  attendance_risk:   { icon: Calendar,   color: 'text-yellow-400',     bg: 'bg-yellow-400/5    border-yellow-400/15',       label: 'Presença'    },
  draw_suggestion:   { icon: Shuffle,    color: 'text-green-400',      bg: 'bg-green-400/5     border-green-400/15',        label: 'Sorteio'     },
};

const formatTimeLeft = (validUntil) => {
  if (!validUntil) return null;
  const diff = new Date(validUntil) - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h restantes` : `${m}min restantes`;
};

export default function AiInsightsPanel({ babaId, isPresident }) {
  const [insights,    setInsights]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [lastGenAt,   setLastGenAt]   = useState(null);

  const load = useCallback(async () => {
    if (!babaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_baba_insights', { p_baba_id: babaId });
      if (error) throw error;
      setInsights(data || []);
      if (data?.length) {
        setLastGenAt(data[0].generated_at);
      }
    } catch (err) {
      console.error('[AiInsightsPanel] load:', err);
    } finally {
      setLoading(false);
    }
  }, [babaId]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    if (!isPresident) return;
    setGenerating(true);
    const toastId = toast.loading('Gerando insights com IA...', { icon: '🤖' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-insights`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ baba_id: babaId }),
        }
      );

      if (!res.ok) throw new Error('Falha ao gerar insights');

      const result = await res.json();
      toast.success(`${result.count} insight${result.count > 1 ? 's' : ''} gerado${result.count > 1 ? 's' : ''}!`, { id: toastId });
      await load();
    } catch (err) {
      console.error('[AiInsightsPanel] generate:', err);
      toast.error('Erro ao gerar insights', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-electric" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-low">
            Insights da IA
          </span>
          {lastGenAt && (
            <span className="text-[8px] font-black text-text-muted uppercase">
              · {new Date(lastGenAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>

        {isPresident && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all disabled:opacity-50"
          >
            {generating
              ? <span className="w-3 h-3 border-2 border-cyan-electric border-t-transparent rounded-full animate-spin" />
              : <Zap size={11} />}
            {generating ? 'Gerando...' : 'Gerar'}
          </button>
        )}
      </div>

      {/* Insights */}
      {insights.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-border-subtle rounded-3xl">
          <Sparkles size={28} className="text-text-muted mx-auto mb-2" />
          <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">
            Nenhum insight gerado ainda
          </p>
          {isPresident && (
            <p className="text-[9px] text-text-muted mt-1">
              Toque em "Gerar" para analisar o baba com IA
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map(insight => {
            const cfg  = TYPE_CONFIG[insight.insight_type] || TYPE_CONFIG.player_form;
            const Icon = cfg.icon;
            const timeLeft = formatTimeLeft(insight.valid_until);

            return (
              <div
                key={insight.insight_id}
                className={`p-4 rounded-2xl border ${cfg.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {insight.player_name && (
                          <span className="text-[8px] font-black text-text-muted uppercase">
                            · {insight.player_name}
                          </span>
                        )}
                      </div>
                      {timeLeft && (
                        <span className="text-[8px] font-black text-text-muted">{timeLeft}</span>
                      )}
                    </div>
                    <p className="text-xs font-black text-white leading-relaxed">
                      {insight.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[8px] font-black text-text-muted text-center uppercase tracking-widest">
        Gerado por IA · Atualiza a cada 24h · Baseado nas suas stats
      </p>

      {/* Refresh manual */}
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-1.5 text-[9px] font-black uppercase text-text-muted hover:text-text-low transition-colors disabled:opacity-30 mx-auto"
      >
        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        Atualizar
      </button>
    </div>
  );
}
