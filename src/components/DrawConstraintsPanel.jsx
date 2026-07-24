// src/components/DrawConstraintsPanel.jsx
// Sprint 16 — Gerenciar restrições de sorteio: must_together / must_apart
// Presidente define quais jogadores devem ficar juntos ou separados nos times

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Link, Unlink, Plus, Trash2, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useBaba }  from '../contexts/BabaContext';
import toast        from 'react-hot-toast';

const TYPE_CONFIG = {
  must_together: {
    label:  'Juntos',
    sub:    'Sempre no mesmo time',
    icon:   Link,
    color:  'text-green-400',
    bg:     'bg-green-400/5 border-green-400/20',
    badge:  'bg-green-400/10 text-green-400 border-green-400/20',
  },
  must_apart: {
    label:  'Separados',
    sub:    'Sempre em times diferentes',
    icon:   Unlink,
    color:  'text-red-400',
    bg:     'bg-red-400/5 border-red-400/20',
    badge:  'bg-red-400/10 text-red-400 border-red-400/20',
  },
};

const Avatar = ({ name, avatarUrl }) => (
  <div className="w-7 h-7 rounded-full bg-surface-3 border border-border-mid flex items-center justify-center overflow-hidden flex-shrink-0">
    {avatarUrl
      ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      : <span className="text-[9px] font-black text-text-low">{(name || '?')[0].toUpperCase()}</span>
    }
  </div>
);

export default function DrawConstraintsPanel() {
  const { currentBaba, players } = useBaba();

  const [constraints, setConstraints] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [showForm,    setShowForm]    = useState(false);

  // Form
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [type,    setType]    = useState('must_together');
  const [reason,  setReason]  = useState('');

  const load = useCallback(async () => {
    if (!currentBaba?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_draw_constraints', {
        p_baba_id: currentBaba.id,
      });
      if (error) throw error;

      // Enriquecer com dados dos jogadores
      const playerMap = new Map(players.map(p => [p.id, p]));
      const enriched  = (data || []).map(c => ({
        ...c,
        player_a: playerMap.get(c.player_a_id),
        player_b: playerMap.get(c.player_b_id),
      }));
      setConstraints(enriched);
    } catch (err) {
      console.error('[DrawConstraintsPanel] load:', err);
    } finally {
      setLoading(false);
    }
  }, [currentBaba?.id, players]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!playerA || !playerB) { toast.error('Selecione dois jogadores'); return; }
    if (playerA === playerB)  { toast.error('Selecione jogadores diferentes'); return; }

    // Verificar duplicata localmente
    const dup = constraints.find(c =>
      (c.player_a_id === playerA && c.player_b_id === playerB) ||
      (c.player_a_id === playerB && c.player_b_id === playerA)
    );
    if (dup) { toast.error('Restrição já existe para estes jogadores'); return; }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('draw_constraints')
        .insert({
          baba_id:     currentBaba.id,
          player_a_id: playerA,
          player_b_id: playerB,
          type,
          reason:      reason.trim() || null,
          created_by:  (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast.success('Restrição criada!');
      setShowForm(false);
      setPlayerA('');
      setPlayerB('');
      setReason('');
      await load();
    } catch (err) {
      console.error('[DrawConstraintsPanel] create:', err);
      toast.error('Erro ao criar restrição');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (playerAId, playerBId, constraintType) => {
    try {
      const { error } = await supabase
        .from('draw_constraints')
        .update({ is_active: false })
        .eq('baba_id',     currentBaba.id)
        .eq('player_a_id', playerAId)
        .eq('player_b_id', playerBId)
        .eq('type',        constraintType);

      if (error) throw error;
      toast.success('Restrição removida');
      await load();
    } catch (err) {
      toast.error('Erro ao remover');
    }
  };

  // Jogadores disponíveis para selecionar (excluindo o já selecionado)
  const playersForA = players;
  const playersForB = players.filter(p => p.id !== playerA);

  const together = constraints.filter(c => c.constraint_type === 'must_together');
  const apart    = constraints.filter(c => c.constraint_type === 'must_apart');

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-cyan-electric" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-low">
            Restrições do Sorteio
          </span>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all"
        >
          <Plus size={12} />
          Nova
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="p-4 rounded-2xl bg-surface-1 border border-border-mid space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-low">
            Nova restrição
          </p>

          {/* Tipo */}
          <div className="flex gap-2">
            {Object.entries(TYPE_CONFIG).map(([id, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                    type === id
                      ? `${cfg.bg} ${cfg.color}`
                      : 'bg-surface-2 border-border-mid text-text-low hover:text-white'
                  }`}
                >
                  <Icon size={12} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Jogador A */}
          <div>
            <label className="text-[9px] font-black uppercase text-text-low mb-1 block">
              Jogador 1
            </label>
            <div className="relative">
              <select
                value={playerA}
                onChange={e => setPlayerA(e.target.value)}
                className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-xs font-black text-white focus:outline-none focus:border-cyan-electric/50 appearance-none"
              >
                <option value="" className="bg-black">Selecione...</option>
                {playersForA.map(p => (
                  <option key={p.id} value={p.id} className="bg-black">{p.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Jogador B */}
          <div>
            <label className="text-[9px] font-black uppercase text-text-low mb-1 block">
              Jogador 2
            </label>
            <div className="relative">
              <select
                value={playerB}
                onChange={e => setPlayerB(e.target.value)}
                className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-xs font-black text-white focus:outline-none focus:border-cyan-electric/50 appearance-none"
              >
                <option value="" className="bg-black">Selecione...</option>
                {playersForB.map(p => (
                  <option key={p.id} value={p.id} className="bg-black">{p.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-[9px] font-black uppercase text-text-low mb-1 block">
              Motivo (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Rivalidade, melhor amigo..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-xs font-black text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50"
            />
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-border-mid text-[10px] font-black uppercase text-text-low hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-cyan-electric text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {creating
                ? <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : <Plus size={12} />}
              {creating ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={16} className="text-cyan-electric animate-spin" />
        </div>
      )}

      {/* Lista: Juntos */}
      {!loading && together.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-green-400/70 px-1 flex items-center gap-1.5">
            <Link size={10} /> Jogam juntos ({together.length})
          </p>
          {together.map((c, i) => (
            <ConstraintRow
              key={i}
              constraint={c}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Lista: Separados */}
      {!loading && apart.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-400/70 px-1 flex items-center gap-1.5">
            <Unlink size={10} /> Jogam separados ({apart.length})
          </p>
          {apart.map((c, i) => (
            <ConstraintRow
              key={i}
              constraint={c}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Vazio */}
      {!loading && constraints.length === 0 && !showForm && (
        <div className="py-8 text-center">
          <Users size={24} className="text-text-muted mx-auto mb-2" />
          <p className="text-[10px] font-black uppercase text-text-low tracking-widest">
            Nenhuma restrição definida
          </p>
          <p className="text-[9px] text-text-muted mt-1">
            O sorteio será feito apenas pelo balanceamento de notas
          </p>
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-1.5 text-[9px] font-black uppercase text-text-muted hover:text-text-low transition-colors disabled:opacity-30"
      >
        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        Atualizar
      </button>
    </div>
  );
}

// ─── ConstraintRow ────────────────────────────────────────────────────────────

const ConstraintRow = ({ constraint, onDelete }) => {
  const cfg  = TYPE_CONFIG[constraint.constraint_type] || TYPE_CONFIG.must_together;
  const Icon = cfg.icon;
  const nameA = constraint.player_a?.name || 'Jogador';
  const nameB = constraint.player_b?.name || 'Jogador';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${cfg.bg}`}>
      <Avatar name={nameA} avatarUrl={constraint.player_a?.profile?.avatar_url} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-white truncate">{nameA}</span>
          <Icon size={11} className={cfg.color} />
          <span className="text-[11px] font-black text-white truncate">{nameB}</span>
        </div>
        {constraint.reason && (
          <p className="text-[9px] text-text-muted font-black mt-0.5 truncate">{constraint.reason}</p>
        )}
      </div>

      <Avatar name={nameB} avatarUrl={constraint.player_b?.profile?.avatar_url} />

      <button
        onClick={() => onDelete(constraint.player_a_id, constraint.player_b_id, constraint.constraint_type)}
        aria-label="Remover restrição"
        className="p-2 rounded-xl bg-surface-2 border border-border-mid text-text-muted hover:text-red-400 hover:border-red-500/30 transition-all flex-shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};